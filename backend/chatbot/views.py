from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
import os
from google import genai
import re

@csrf_exempt
def generate_content(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            prompt = data.get('prompt', 'Explain how AI works')
            
            # Check if the prompt is related to Zoho Books
            if re.search(r'zoho\s*books|zoho', prompt.lower()):
                # Read the knowledge base file
                info_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'chatbot', 'info.txt')
                with open(info_path, 'r') as file:
                    knowledge_base = file.read()
                
                # Extract relevant information based on the prompt - strictly from knowledge base
                answers = generate_answers_from_knowledge(prompt, knowledge_base)
                
                # If we couldn't find a meaningful answer in the knowledge base
                if not answers:
                    return JsonResponse({'error': 'I don\'t have information about this in my knowledge base.'}, status=404)
                    
                return JsonResponse({'answers': answers})
            else:
                # Use Gemini for non-Zoho Books questions
                client = genai.Client(api_key="AIzaSyALPHnanV8F8RW7MfaRkyAZShRYTQoewQ0")
                response = client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=prompt,
                )
                return JsonResponse({'text': response.text})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Invalid request method'}, status=400)

def generate_answers_from_knowledge(prompt, knowledge_base):
    # Convert prompt to lowercase for case-insensitive matching
    prompt_lower = prompt.lower()
    
    # Define sections in the knowledge base
    sections = knowledge_base.split('\n\n\n')
    
    # List of important keywords to check
    keywords = ['dashboard', 'template', 'invoice', 'payment', 'tax', 'currency', 
                'user', 'organization', 'backup', 'automation', 'report', 
                'integration', 'contact', 'branch', 'location', 'email', 'sms', 
                'reminder', 'webhook', 'security', 'privacy', 'signal', 'document',
                'access', 'plan', 'upgrade', 'downgrade', 'personalize', 'theme', 
                'logo', 'delete', 'opening balance', 'custom', 'gst', 'tds',
                'domain', 'connection', 'inventory', 'project']
    
    # Extract all words from the prompt (excluding common stop words)
    stop_words = ['a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 
                 'to', 'of', 'and', 'in', 'that', 'have', 'with', 'for', 'on', 'at', 
                 'by', 'about', 'how', 'what', 'when', 'where', 'who', 'which', 'why',
                 'can', 'do', 'does', 'did', 'has', 'had', 'will', 'would', 'should', 
                 'could', 'may', 'might', 'must', 'shall']
    
    prompt_words = [word.lower() for word in prompt_lower.split() if word.lower() not in stop_words]
    
    # Find direct keyword matches and potential content matches
    matched_keywords = [kw for kw in keywords if kw in prompt_lower]
    potential_matches = []
    
    # Score each section for relevance to the prompt
    section_scores = []
    for section_index, section in enumerate(sections):
        score = 0
        section_lower = section.lower()
        
        # Score based on number of prompt words found in the section
        for word in prompt_words:
            if word in section_lower:
                score += 1
        
        # Boost score for sections with keywords
        for keyword in matched_keywords:
            if keyword in section_lower:
                score += 3
        
        # Parse the section title if available
        section_title = ""
        section_lines = section.split('\n')
        if section_lines:
            section_title = section_lines[0]
            
        if score > 0:
            section_scores.append((section_index, score, section_title, section))
    
    # Sort sections by relevance score (highest first)
    section_scores.sort(key=lambda x: x[1], reverse=True)
    
    # If no specific matches found in knowledge base, return empty list to indicate no knowledge found
    if not section_scores:
        # Check if the prompt contains terms related to Zoho Books functionality
        zoho_terms = [kw for kw in keywords if kw in prompt_lower]
        
        # If there are specific Zoho terms but no matches, it means we don't have info on this topic
        if zoho_terms:
            return []
            
        # If no specific Zoho terms were found in the query, provide a generic response from the knowledge base
        # Find any section that looks like an index or introduction in the knowledge base
        index_section = None
        for section in sections:
            section_lower = section.lower()
            if ("index" in section_lower or "introduction" in section_lower or 
                "overview" in section_lower or "about" in section_lower):
                index_section = section
                break
        
        # If found an index/intro section, use it
        if index_section:
            lines = index_section.split('\n')
            title = lines[0].strip() if lines else "Zoho Books"
            content = ' '.join(lines[1:3]).strip() if len(lines) > 1 else "Information about Zoho Books"
        # Otherwise take the first section from knowledge base
        else:
            first_section = sections[0] if sections else ""
            lines = first_section.split('\n')
            title = lines[0].strip() if lines else "Zoho Books"
            content = ' '.join(lines[1:3]).strip() if len(lines) > 1 else "Information about Zoho Books"
        
        # Ensure the content isn't too long
        if len(content) > 150:
            content = content[:150] + "..."
            
        return [{"title": title, "content": content}]
    
    # Take the top 3 most relevant sections only
    top_sections = section_scores[:min(3, len(section_scores))]
    
    # Format the response as an array of answer objects
    answers = []
    
    for idx, (_, _, _, content) in enumerate(top_sections):
        # Parse the section into lines
        lines = content.split('\n')
        
        # Extract title and content
        title = lines[0].strip() if lines and lines[0].strip() else ""
        
        # Join the rest of the lines as content
        full_content = ' '.join(lines[1:]) if len(lines) > 1 else ""
        
        # Create a brief version of the content - first two sentences
        sentences = full_content.split('.')
        brief_content = '.'.join(sentences[:2]).strip()
        
        # Ensure the content isn't too long
        if len(brief_content) > 150:
            brief_content = brief_content[:150] + "..."
            
        answers.append({
            "title": title,
            "content": brief_content
        })
    
    return answers
