import os
import re
import json
from datetime import datetime
from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# LangChain & Groq Imports
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# 1. Load Environment Variables
load_dotenv()

# 2. Setup Logging Directory
LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True)

# 3. Setup FastAPI App
app = FastAPI()

# 4. CORS Setup (Crucial for Next.js to talk to Python)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Only in Dev mode
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 5. Setup Groq Models
# Model 1: For generating custom prompts based on user inputs
prompt_engineer_model = ChatGroq(
    temperature=0.7,  # Higher creativity for prompt generation
    model_name="llama-3.1-8b-instant",
    api_key=os.getenv("GROQ_API_KEY")
)

# Model 2: For tech stack recommendation (keep conservative)
stack_model = ChatGroq(
    temperature=0.2, 
    model_name="llama-3.1-8b-instant", 
    api_key=os.getenv("GROQ_API_KEY")
)

# 6. Logging Function
def log_request_response(user_inputs: dict, response: str, model_type: str = "stack", custom_prompt: str = None, master_prompt: str = None):
    """
    Log API requests and responses for learning and analysis
    """
    try:
        timestamp = datetime.now().isoformat()
        log_entry = {
            "timestamp": timestamp,
            "model_type": model_type,
            "inputs": user_inputs,
            "master_prompt": master_prompt,  # Store the complete master prompt (custom + system)
            "response_preview": response[:500],  # Store first 500 chars as preview
            "response_length": len(response)
        }
        
        log_file = LOG_DIR / f"{model_type}_responses.jsonl"
        with open(log_file, "a") as f:
            f.write(json.dumps(log_entry) + "\n")
    except Exception as e:
        print(f"Logging error: {e}")

# 7. Prompt Engineering System Prompt
prompt_engineer_system = """You are an expert AI architect that generates detailed, contextual prompts for tech stack recommendations.

Given user inputs about their project, generate a prompt that will help another AI make HIGHLY CONTEXTUALIZED tech stack recommendations - not generic ones.

Key principle: Every tech choice MUST be justified relative to the user's SPECIFIC constraints and priorities, not just generic pros/cons.

The generated prompt should:
1. Synthesize all user inputs into coherent context (app type, scale, budget, timeline, team, security needs)
2. Identify the PRIMARY decision drivers (e.g., "Cost is the main driver here" or "Scaling to 1M users is the hard constraint")
3. Highlight trade-offs that matter to THIS specific project
4. Guide the recommender to explain choices in context of the project's unique situation
5. Ensure recommendations consider team size, time-to-market, and budget constraints
6. Request that pros/cons be specific to the project context, not generic

Output ONLY the detailed, contextual prompt. No explanations. Make it substantive (2-4 paragraphs explaining the business context and key decision factors)."""

# 8. System Prompt for Tech Stack Recommendation (WITH MERMAID RULES - DO NOT MODIFY)
system_prompt = """CRITICAL: You MUST provide BOTH the architecture diagram AND the tech stack recommendations below. 

Structure your answer EXACTLY as follows:

## Architecture Diagram
Provide a Mermaid.js diagram showing the complete system architecture for the PRIMARY recommended stack.

## PRIMARY Technology Stack

IMPORTANT: Recommend ONE cohesive tech stack that works well together. Choose technologies that:
- Are proven to work well with each other
- Match the user's requirements
- Have good community support and documentation
- Are production-ready

### Frontend
**Tech_Name** - emoji_or_icon
Pros:
• [Specific advantage tied to their app type/scale/budget]
• [Specific advantage tied to their timeline/team size/focus]
• [Specific advantage tied to their security/performance needs]
Cons:
• [Specific limitation relative to their constraints]
• [Specific limitation relative to their team size/experience]
• [Specific limitation relative to their budget/timeline]
Why: [Explain why this is the BEST choice FOR THEIR EXACT SITUATION. Reference their specific inputs: app type, scale, budget, team size, timeline, security level, or stated focus. Be concrete - e.g., "For a solo developer with a tight 2-month deadline, React's component reusability saves critical time" rather than generic statements.]

### Backend
**Tech_Name** - emoji_or_icon
Pros:
• [Specific advantage tied to their app type/scale/budget]
• [Specific advantage tied to their timeline/team size/focus]
• [Specific advantage tied to their security/performance needs]
Cons:
• [Specific limitation relative to their constraints]
• [Specific limitation relative to their team size/experience]
• [Specific limitation relative to their budget/timeline]
Why: [Explain why this is the BEST choice FOR THEIR EXACT SITUATION. Reference their specific inputs: app type, scale, budget, team size, timeline, security level, or stated focus. Be concrete about how this serves their particular needs.]

### Database
**Tech_Name** - emoji_or_icon
Pros:
• [Specific advantage tied to their data/scale needs]
• [Specific advantage tied to their cost/performance priorities]
• [Specific advantage tied to their team expertise/maturity needs]
Cons:
• [Specific limitation relative to their use case]
• [Specific limitation relative to their priorities]
• [Specific limitation relative to their team/constraints]
Why: [Explain why this is the BEST choice FOR THEIR EXACT SITUATION. Reference their specific inputs: scale, data type, budget, team size, or stated priorities. Be concrete about how this database solves their particular problem.]

### DevOps/Infrastructure
**Tech_Name** - emoji_or_icon
Pros:
• [Specific advantage for their deployment/scaling needs]
• [Specific advantage relative to their budget/operational model]
• [Specific advantage relative to their team size/expertise]
Cons:
• [Specific limitation relative to their timeline/complexity]
• [Specific limitation relative to their team experience]
• [Specific limitation relative to their budget/resources]
Why: [Explain why this is the BEST choice FOR THEIR EXACT SITUATION. Reference their specific inputs: scale, timeline, team size, budget, or operational constraints. Be concrete.]

### Additional Services
**Tech_Name** - emoji_or_icon
Pros:
• [Specific advantage for their primary stack integration]
• [Specific advantage for their performance/monitoring/caching needs]
• [Specific advantage relative to their budget/complexity priorities]
Cons:
• [Specific operational cost/complexity trade-off]
• [Specific maintenance burden relative to their team]
• [Specific limitation relative to their constraints]
Why: [Explain why this is the BEST choice FOR THEIR EXACT SITUATION. Reference their specific inputs: app needs, team size, budget, scale. Be concrete about the value it adds to THEIR specific project.]

## ALTERNATIVE Technology Stacks

Provide up to 3 alternative tech stack options with the SAME format as PRIMARY. Each alternative should:
- Solve the same problem differently
- Have different trade-offs (e.g., cost vs performance, simplicity vs scalability)
- Still be cohesive and production-ready

FOR EACH ALTERNATIVE, START WITH AN EXPLANATION:
**When to use this stack:** Explain the specific scenario where this stack is BETTER than PRIMARY for the user's project type and constraints. Reference their business priorities (e.g., "If cost is your absolute priority...", "If you need extreme scalability...", "If you have a more experienced team in X language...").

**Primary trade-off vs recommended stack:** Explain the key difference between this and the PRIMARY recommendation. What are you trading OFF to GAIN with this alternative? (e.g., "Trading development speed for raw performance", "Trading operational simplicity for cost savings")

**Why this option is worth considering:** Briefly explain why this exists in the list - what makes it a viable alternative given their project context?

Then provide the full tech stack with the same format as PRIMARY (### Frontend, ### Backend, etc. with pros/cons/why for each technology).

Use headers like:
## ALTERNATIVE STACK #1
**When to use this stack:** [explanation]
**Primary trade-off vs recommended stack:** [trade-off explanation]
**Why this option is worth considering:** [context-specific reasoning]

### Frontend
...
### Backend
...
etc.

## ALTERNATIVE STACK #2
[same explanation format]
...

## ALTERNATIVE STACK #3
[same explanation format]
...

NOTE: Do NOT suggest multiple options in the same category within a single stack. Pick the BEST option for the given requirements.

CRITICAL MERMAID SYNTAX RULES - FOLLOW THESE STRICTLY:

1. Start diagram with: graph TD

2. Node Definition Rules - MUST FOLLOW EXACTLY:
   - Node IDs: ONLY letters, numbers, underscores (NO spaces, NO hyphens, NO slashes)
   - Examples of VALID node IDs: Client, API, DB, Cache, Queue, Frontend, Backend, WebServer, AppServer
   - EVERY node definition MUST have BOTH opening and closing brackets: NodeID[Label]
   - Node labels (inside brackets): Use UNDERSCORES instead of spaces
   - Example: APIGateway[API_Gateway] or WebServer[Web_Server]
   - NEVER generate incomplete nodes like: Worker[Worker_Service (MUST BE Worker[Worker_Service])
   - NO special characters in labels except underscores
   - NO HTML entities, no Unicode special chars
   - Max label: 40 chars

3. Connection Rules - STRICT:
   - Use ONLY: A --> B (simple connection)
   - Labels on arrows: A -->|Label_Text| B - MUST HAVE target node after pipe
   - Arrow labels MUST use UNDERSCORES for multiple words
   - Example: Client -->|HTTP_Request| API
   - NEVER generate incomplete arrows like: Service -->|Cache| (MUST have target node)
   - NO spaces in arrow labels
   - NO dotted lines, NO special arrows

4. Node Styling:
   - Rectangles: NodeID[Node_Label]
   - Rounded: NodeID([Node_Label])
   - Diamonds: NodeID[Decision]
   - Circles: NodeID((Round_Node))

5. Structure:
   - Maximum 10 nodes
   - Clear hierarchy
   - Every connection must have both source and target nodes

6. EXACT VALID EXAMPLE:
   graph TD
       Client[Client]
       APIGateway[API_Gateway]
       Backend[Backend_Service]
       DB[(Database)]
       Cache[Cache]
       
       Client -->|HTTP_Request| APIGateway
       APIGateway -->|Route| Backend
       Backend -->|Query| DB
       Backend -->|Cache| Cache

CRITICAL - DO NOT GENERATE:
- Incomplete node definitions: Worker[Worker_Service (MUST END WITH BRACKET])
- Incomplete arrows with labels but no target: Backend -->|Cache| (MUST HAVE TARGET NODE)
- Incomplete arrows at all: A --> (MUST HAVE TARGET)
- Arrows ending with pipe: A -->| (THIS BREAKS MERMAID)
- Node names with spaces: A Name (MUST USE AName or A_Name)
- Arrow labels with spaces: A -->|My Label| B (MUST BE A -->|My_Label| B)

DO NOT:
- Use spaces in node IDs or labels - USE UNDERSCORES INSTEAD
- Use: A -->|>B or A -.-|> B or A ====> B
- Use square brackets inside labels
- Use HTML entities
- Create incomplete anything - EVERY line must be complete and valid
- Use special characters except underscores

IMPORTANT: After providing the mermaid diagram, ALWAYS include the complete PRIMARY Technology Stack and all sections (Frontend, Backend, Database, DevOps, Additional Services) with pros, cons, and why explanations for each technology.
"""

# Function to extract and validate mermaid code from response
def process_response_stream(text: str) -> str:
    """
    Extract mermaid blocks, validate them, and return cleaned response
    """
    # Find mermaid code blocks
    mermaid_pattern = r'```mermaid\n(.*?)\n```'
    matches = re.finditer(mermaid_pattern, text, re.DOTALL)
    
    cleaned_text = text
    for match in matches:
        mermaid_code = match.group(1)
        is_valid, message = validate_mermaid_syntax(mermaid_code)
        
        if not is_valid:
            # Replace invalid mermaid block with error message
            cleaned_text = cleaned_text.replace(
                match.group(0),
                f"```\n⚠️ Architecture diagram could not be generated.\nReason: {message}\n```"
            )
    
    return cleaned_text

# LangChain Pipelines
stack_prompt_template = ChatPromptTemplate.from_messages([
    ("system", system_prompt),
    ("user", "{custom_prompt}")
])

stack_chain = stack_prompt_template | stack_model | StrOutputParser()

# Prompt Engineering Prompt Template
prompt_engineer_template = ChatPromptTemplate.from_messages([
    ("system", prompt_engineer_system),
    ("user", "App Type: {appType}, Scale: {scale}, Focus: {focus}, Team Size: {teamSize}, Budget: {budget}, Time to Market: {timeToMarket}, Security Level: {securityLevel}, Additional: {customConstraints}")
])

prompt_engineer_chain = prompt_engineer_template | prompt_engineer_model | StrOutputParser()

# 7. Request and Response Models
class TechItem(BaseModel):
    name: str
    pros: list[str] = []
    cons: list[str] = []
    why: str = ""

class TechStack(BaseModel):
    frontend: list[TechItem] = []
    backend: list[TechItem] = []
    database: list[TechItem] = []
    devops: list[TechItem] = []
    additional: list[TechItem] = []

class RecommendationResponse(BaseModel):
    architecture_diagram: str
    primary: TechStack
    alternatives: list[TechStack] = []
    alternative_explanations: list[dict] = []  # {stack_num, when_to_use, trade_off, why_consider}

class StackRequest(BaseModel):
    appType: str
    scale: str
    focus: str
    teamSize: str = "not specified"
    budget: str = "not specified"
    timeToMarket: str = "not specified"
    securityLevel: str = "standard"
    customConstraints: str = ""

class PromptGenerationRequest(BaseModel):
    appType: str
    scale: str
    focus: str
    teamSize: str = "not specified"
    budget: str = "not specified"
    timeToMarket: str = "not specified"
    securityLevel: str = "standard"
    customConstraints: str = ""

# Mermaid Sanitizer and Validator
def sanitize_mermaid_code(code: str) -> str:
    """
    Clean up mermaid code to fix common generation issues
    """
    lines = []
    for line in code.split('\n'):
        # Strip leading/trailing whitespace
        line = line.strip()
        if not line or line.startswith('graph'):
            if line:
                lines.append(line)
            continue
        
        # SKIP completely incomplete arrows - these will break mermaid anyway
        # Skip: A -->|Label| (no target) 
        if line.endswith('-->|') or line.endswith('-->') or re.search(r'-->\|[^|]*\|?\s*$', line):
            # Incomplete arrow, skip it
            continue
        
        # Fix unclosed brackets - add closing bracket if needed
        # Pattern: NodeID[Label without closing bracket (not on arrow lines)
        if '[' in line and ']' not in line and '-->' not in line:
            line = line + ']'
        
        # For arrow lines with unclosed brackets in target
        # Pattern: A -->|Label| B[ should become A -->|Label| B[]
        if '-->' in line and '[' in line and ']' not in line:
            # Only add bracket if the line ends with an incomplete bracket
            if line.rstrip().endswith('['):
                line = line + ']'
            # But if it has content after bracket that's not valid, skip the line
            elif not re.search(r'\[[a-zA-Z0-9_]*\]', line):
                # Can't fix this, skip it
                continue
        
        # Fix spaces in node labels - replace spaces with underscores in brackets
        # Pattern: NodeID[Label With Spaces] -> NodeID[Label_With_Spaces]
        line = re.sub(r'(\[)([^\]]+)(\])', 
                      lambda m: m.group(1) + m.group(2).replace(' ', '_') + m.group(3), 
                      line)
        
        # Fix spaces in arrow labels - replace spaces with underscores
        # Pattern: -->|Label With Spaces| -> -->|Label_With_Spaces|
        line = re.sub(r'(\|)([^\|]+)(\|)', 
                      lambda m: m.group(1) + m.group(2).replace(' ', '_') + m.group(3), 
                      line)
        
        # Verify line is valid after processing
        # Must have balanced brackets and pipes if this is an arrow
        if '-->' in line:
            # Arrow line - must have target node or be removed
            if not re.search(r'-->\s*[a-zA-Z0-9_]+\[\w*\]', line) and not re.search(r'-->\|[^|]+\|\s*[a-zA-Z0-9_]+', line):
                # Can't find valid target node, skip this line
                continue
        
        lines.append(line)
    
    return '\n'.join(lines)

def validate_mermaid_syntax(code: str) -> tuple[bool, str]:
    """
    Validate mermaid diagram syntax and return (is_valid, error_message)
    """
    if not code or len(code.strip()) < 10:
        return False, "Code too short"
    
    # Sanitize first
    code = sanitize_mermaid_code(code)
    lines = code.strip().split('\n')
    
    # Check if starts with graph TD
    if not any('graph TD' in line for line in lines[:3]):
        return False, "Must start with 'graph TD'"
    
    # Check for bracket matching - count brackets per line
    for line in lines:
        if line.strip() and not line.strip().startswith('graph'):
            open_brackets = line.count('[')
            close_brackets = line.count(']')
            if open_brackets != close_brackets:
                return False, f"Unmatched brackets in line: {line[:40]}"
            
            open_pipes = line.count('|')
            if open_pipes > 0 and open_pipes % 2 != 0:
                return False, f"Unmatched pipes in arrow label: {line[:40]}"
    
    # Check for invalid arrow patterns
    invalid_patterns = [
        (r'--\.-+', 'Dotted arrows not allowed'),
        (r'-+\|>', 'Special arrowheads not allowed'),
        (r'===+>', 'Thick arrows not allowed'),
        (r'-->+\*', 'Invalid symbols in arrows'),
        (r'\]\[', 'Consecutive brackets error'),
        (r'-->\|\s*$', 'Incomplete arrow statement'),
        (r'-->\|$', 'Missing arrow label target'),
    ]
    
    for pattern, reason in invalid_patterns:
        if re.search(pattern, code, re.MULTILINE):
            return False, reason
    
    # Check for HTML entities
    if '&lt;' in code or '&gt;' in code or '&amp;' in code:
        return False, "HTML entities not allowed"
    
    # Check for spaces in node IDs (should be underscores)
    # Valid: NodeID[Label] or -->|Label_Text|
    # Invalid: Node ID[Label] or -->|Label Text|
    if re.search(r'\s+\[', code):
        return False, "Spaces in node definitions"
    
    # Check node definitions exist
    node_pattern = r'[a-zA-Z0-9_]+\['
    if not re.search(node_pattern, code):
        return False, "No valid nodes found"
    
    # Check connections exist
    arrow_pattern = r'-->'
    if not re.search(arrow_pattern, code):
        return False, "No valid connections found"
    
    return True, code


# Parse response into structured format
def parse_tech_stack_response(response: str) -> RecommendationResponse:
    """
    Parse the LLM response into a structured RecommendationResponse
    """
    print(f"\n=== PARSE START: Response length {len(response)} ===")
    print(f"First 500 chars:\n{response[:500]}\n")
    
    # Extract architecture diagram
    mermaid_match = re.search(r'```mermaid\n(.*?)\n```', response, re.DOTALL)
    diagram = mermaid_match.group(1) if mermaid_match else ""
    
    # Extract PRIMARY stack
    primary_match = re.search(r'## PRIMARY Technology Stack\n(.*?)(?=## ALTERNATIVE|$)', response, re.DOTALL)
    primary_text = primary_match.group(1) if primary_match else ""
    print(f"\n=== PRIMARY section length: {len(primary_text)} ===")
    print(f"PRIMARY first 300 chars:\n{primary_text[:300]}\n")
    primary_stack = parse_stack_section(primary_text)
    
    # Extract alternatives
    alternatives = []
    alternative_explanations = []
    alt_pattern = r'## ALTERNATIVE STACK #(\d+)\n(.*?)(?=## ALTERNATIVE STACK #\d+|$)'
    for match in re.finditer(alt_pattern, response, re.DOTALL):
        stack_num = int(match.group(1))
        alt_text = match.group(2)
        
        # Extract explanation lines
        when_match = re.search(r'\*\*When to use this stack:\*\*\s*(.+?)(?:\n\n|\*\*)', alt_text, re.DOTALL)
        trade_match = re.search(r'\*\*Primary trade-off vs recommended stack:\*\*\s*(.+?)(?:\n\n|\*\*)', alt_text, re.DOTALL)
        why_match = re.search(r'\*\*Why this option is worth considering:\*\*\s*(.+?)(?:\n\n###)', alt_text, re.DOTALL)
        
        alternative_explanations.append({
            "stack_num": stack_num,
            "when_to_use": when_match.group(1).strip() if when_match else "",
            "trade_off": trade_match.group(1).strip() if trade_match else "",
            "why_consider": why_match.group(1).strip() if why_match else ""
        })
        
        alternatives.append(parse_stack_section(alt_text))
    
    return RecommendationResponse(
        architecture_diagram=diagram,
        primary=primary_stack,
        alternatives=alternatives,
        alternative_explanations=alternative_explanations
    )

def parse_stack_section(text: str) -> TechStack:
    """
    Parse a single tech stack section (PRIMARY or ALTERNATIVE)
    """
    stack = TechStack()
    lines = text.split('\n')
    current_category = None
    current_tech = None
    parsing_mode = None  # 'pros', 'cons', or None
    
    for i, line in enumerate(lines):
        line_stripped = line.strip()
        if not line_stripped:
            parsing_mode = None
            continue
        
        # Skip explanation lines
        if line_stripped.startswith('**') and any(kw in line_stripped for kw in ['When to use', 'Primary trade-off', 'Why this option']):
            parsing_mode = None
            continue
        
        # Detect category
        if line_stripped.startswith('### '):
            if current_tech and current_category:
                getattr(stack, current_category).append(current_tech)
                current_tech = None
            parsing_mode = None
            
            if 'Frontend' in line_stripped:
                current_category = 'frontend'
            elif 'Backend' in line_stripped:
                current_category = 'backend'
            elif 'Database' in line_stripped:
                current_category = 'database'
            elif 'DevOps' in line_stripped or 'Infrastructure' in line_stripped:
                current_category = 'devops'
            elif 'Additional' in line_stripped:
                current_category = 'additional'
            continue
        
        # Extract tech name
        if line_stripped.startswith('**') and ' - ' in line_stripped and current_category:
            if current_tech and current_category:
                getattr(stack, current_category).append(current_tech)
            
            # Parse: **Tech_Name:** TechName - emoji or **TechName** - emoji
            match = re.search(r'\*\*Tech_Name:\*\*\s+(.+?)\s+-\s+', line_stripped)
            if not match:
                match = re.search(r'\*\*(.+?)\*\*\s*-\s*', line_stripped)
            
            if match:
                current_tech = TechItem(name=match.group(1).strip())
                parsing_mode = None
            continue
        
        # Detect pros section start
        if line_stripped.lower() == 'pros:' and current_tech:
            parsing_mode = 'pros'
            continue
        
        # Detect cons section start
        if line_stripped.lower() == 'cons:' and current_tech:
            parsing_mode = 'cons'
            continue
        
        # Detect why section start
        if line_stripped.lower().startswith('why:') and current_tech:
            # Could be on same line or next line
            if line_stripped.lower() == 'why:':
                parsing_mode = 'why'
            else:
                current_tech.why = re.sub(r'^why:\s*', '', line_stripped, flags=re.IGNORECASE).strip()
                parsing_mode = None
            continue
        
        # Handle bullet points for pros/cons
        if line_stripped.startswith('•') and current_tech:
            bullet_text = line_stripped[1:].strip()
            # Clean up the text - remove bold markers and trailing commas
            bullet_text = re.sub(r'\*\*([^*]+)\*\*:\s*', '', bullet_text)  # Remove **title:** prefix
            bullet_text = re.sub(r',\s*$', '', bullet_text)  # Remove trailing comma
            bullet_text = bullet_text.strip()
            
            if parsing_mode == 'pros':
                current_tech.pros.append(bullet_text)
            elif parsing_mode == 'cons':
                current_tech.cons.append(bullet_text)
            continue
        
        # Handle multi-line why
        if parsing_mode == 'why' and current_tech and line_stripped:
            if not line_stripped.startswith('###'):
                current_tech.why += ' ' + line_stripped
            else:
                parsing_mode = None
                # Process this line as a category
                if 'Frontend' in line_stripped:
                    current_category = 'frontend'
                elif 'Backend' in line_stripped:
                    current_category = 'backend'
                elif 'Database' in line_stripped:
                    current_category = 'database'
                elif 'DevOps' in line_stripped or 'Infrastructure' in line_stripped:
                    current_category = 'devops'
                elif 'Additional' in line_stripped:
                    current_category = 'additional'
            continue
        
        # If we hit a new category or tech while in pros/cons, stop collecting
        if (line_stripped.startswith('###') or line_stripped.startswith('**')) and parsing_mode:
            parsing_mode = None
    
    # Don't forget last tech
    if current_tech and current_category:
        getattr(stack, current_category).append(current_tech)
    
    return stack



# 9. API Endpoints

# Endpoint 1: Generate Custom Prompt Based on User Inputs
@app.post("/api/generate-prompt")
async def generate_prompt(req: PromptGenerationRequest):
    """
    Generate a custom prompt for tech stack recommendation based on user context
    """
    try:
        custom_prompt = await prompt_engineer_chain.ainvoke({
            "appType": req.appType,
            "scale": req.scale,
            "focus": req.focus,
            "teamSize": req.teamSize,
            "budget": req.budget,
            "timeToMarket": req.timeToMarket,
            "securityLevel": req.securityLevel,
            "customConstraints": req.customConstraints
        })
        
        # Log the prompt generation - save both the generated prompt and system prompt
        log_request_response(req.dict(), custom_prompt, "prompt_engineering", 
                            custom_prompt=custom_prompt)
        
        return {"success": True, "prompt": custom_prompt}
    except Exception as e:
        return {"success": False, "error": str(e)}

# Endpoint 2: Recommend Tech Stack Using Generated Prompt
@app.post("/api/recommend")
async def recommend_stack(req: StackRequest):
    """
    Generate tech stack recommendation with context from user inputs
    Returns structured JSON response (non-streaming)
    """
    try:
        print("\n=== BACKEND LOG: Generating custom prompt ===")
        custom_prompt = await prompt_engineer_chain.ainvoke({
            "appType": req.appType,
            "scale": req.scale,
            "focus": req.focus,
            "teamSize": req.teamSize,
            "budget": req.budget,
            "timeToMarket": req.timeToMarket,
            "securityLevel": req.securityLevel,
            "customConstraints": req.customConstraints
        })
        print(f"Custom prompt generated: {custom_prompt[:200]}...")
        
        print("=== BACKEND LOG: Generating tech stack recommendation ===")
        # Get full response (not streaming)
        full_response = await stack_chain.ainvoke({"custom_prompt": custom_prompt})
        
        print(f"\n=== BACKEND LOG: Full response length: {len(full_response)} ===")
        print(f"=== BACKEND LOG: PRIMARY check: {'## PRIMARY' in full_response} ===")
        print(f"=== BACKEND LOG: MERMAID check: {'```mermaid' in full_response} ===")
        
        # Parse response into structured format
        parsed_response = parse_tech_stack_response(full_response)
        
        # Log the response
        log_request_response(req.dict(), full_response, "stack_recommendation",
                            custom_prompt=custom_prompt, master_prompt=system_prompt)
        
        return parsed_response
        
    except Exception as e:
        print(f"Error in recommend_stack: {e}")
        return {"error": str(e)}

# Endpoint 3: Debug - Show what system prompt looks like
@app.get("/api/debug/system-prompt")
def debug_system_prompt():
    """
    Show the system prompt being used (for debugging)
    """
    return {
        "system_prompt_length": len(system_prompt),
        "has_primary": "## PRIMARY" in system_prompt,
        "has_frontend": "### Frontend" in system_prompt,
        "first_500_chars": system_prompt[:500],
        "sample_section": system_prompt[100:400]
    }

# Endpoint 4: Health Check
@app.get("/")
def home():
    return {
        "message": "TechStack.io Brain is Active 🧠",
        "version": "2.0",
        "features": ["prompt_engineering", "tech_stack_recommendation", "mermaid_diagrams", "logging"]
    }