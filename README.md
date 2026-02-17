# StudyPortal

Prompt

You are extracting an answer key from screenshots of a test.
Carefully read the uploaded image(s) and convert the answers into a JSON object that matches EXACTLY the following schema:
{
"Section Name": {
"type": "single | multi | numerical",
"answers": [...]
}
}
Rules:

Detect section headers (e.g., "SECTION (B): MULTIPLE CHOICE QUESTIONS (MULTIPLE OPTIONS CORRECT)", "SECTION (C): ASSERTION-REASONING", etc.).
Use the section title as the JSON key (keep it short like "Section B", "Section C", etc.).
Determine question type:
If multiple options like "A, B, D" → type = "multi"
If single letter like "A" → type = "single"
If numbers or decimals → type = "numerical"
Preserve answer order strictly by question number.
For multi answers:
Remove spaces
Combine letters into a string (e.g., "ABD", "ACD").
For single answers:
Use a single letter string (e.g., "A").
For numerical answers:
Use numbers or decimal values exactly as shown.
Ignore formatting artifacts like dots, alignment marks, or page decorations.
Do NOT add explanations.
Output ONLY valid JSON — no markdown, no commentary.
Example format:
{
"Section B": {
"type": "multi",
"answers": ["AD", "BD", "ACD"]
},
"Section C": {
"type": "single",
"answers": ["C", "A", "B"]
},
"Section E": {
"type": "numerical",
"answers": [4, 6, 3]
}
}
Now extract the answers from the uploaded screenshot(s).

Double-check for OCR mistakes before finalizing.

If uncertain about any answer, mark it as null instead of guessing.
