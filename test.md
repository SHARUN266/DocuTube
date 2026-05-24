# Detailed Test Cases & Execution Plan
## YouTube Video to Project Documentation Generator (YTDG)

This document contains step-by-step test execution plans for manual and automated testing of the unified Next.js application.

---

## 1. URL Input & Validation Test Suite

### TC-URL-001: Valid YouTube Standard URL
* **Description:** Validate that a standard YouTube video link parses successfully and initiates the pipeline.
* **Pre-requisites:** User is logged in and on the dashboard page.
* **Steps:**
  1. Navigate to the dashboard.
  2. Locate the input field labeled "Enter YouTube Video Link".
  3. Paste the URL: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
  4. Click the "Generate Documentation" button.
* **Expected Result:** 
  * The input field shows no validation errors.
  * A loading indicator appears showing: "Validating link and extracting transcript...".
  * The system transitions to the "Processing" state.
* **Verification Method:** Manual UI inspection / Database verification that a new transcript job status is `pending` or `processing`.

---

### TC-URL-002: Invalid Domain URL Validation
* **Description:** Verify the system rejects URLs that do not belong to YouTube.
* **Pre-requisites:** User is on the dashboard page.
* **Steps:**
  1. Navigate to the dashboard.
  2. Locate the YouTube URL input field.
  3. Paste: `https://google.com`
  4. Click the "Generate Documentation" button.
* **Expected Result:**
  * The form prevents submission.
  * An error message is displayed below the input field: *"Please enter a valid YouTube URL (e.g., youtube.com or youtu.be)"*.
  * The button remains enabled, allowing the user to correct the input.
* **Verification Method:** Manual UI check.

---

### TC-URL-003: Video Exceeding Maximum Length (6 Hours)
* **Description:** Ensure the system rejects videos that are too long to prevent excessive API costs and timeouts.
* **Pre-requisites:** User is logged in and has positive credits.
* **Steps:**
  1. Paste a known long YouTube video URL (e.g., a 10-hour ambient video: `https://www.youtube.com/watch?v=wXhTHyIgQ_U`).
  2. Click "Generate Documentation".
* **Expected Result:**
  * The UI blocks processing and shows: *"Videos exceeding 6 hours are not supported. Please select a shorter video."*
  * No API calls are made to Gemini, and no database transcript record is created.
* **Verification Method:** UI assertion.

---

## 2. Transcript Extraction Test Suite

### TC-TX-001: Manual English Transcript Retrieval
* **Description:** Verify the system correctly extracts manual subtitles from a video.
* **Steps:**
  1. Paste a YouTube URL known to have manually uploaded English subtitles (e.g., a popular tech channel tutorial).
  2. Click "Generate Documentation".
* **Expected Result:**
  * System connects to YouTube API, extracts the transcript.
  * Transcript is saved in the `transcripts` table with `language='en'`, `status='completed'`.
  * The raw text preview is displayed in the "Transcript Preview" modal.
* **Verification Method:** SQL check: `SELECT * FROM transcripts WHERE youtube_id = :id;` (Verify raw transcript column is not null).

---

### TC-TX-002: Redis Caching of Transcripts
* **Description:** Verify that requesting the same video twice retrieves the transcript from cache instead of re-fetching from YouTube.
* **Steps:**
  1. Input a YouTube URL and generate documents. (First request).
  2. Note down the processing time.
  3. Open a new tab, paste the same YouTube URL, and click "Generate". (Second request).
* **Expected Result:**
  * The second request completes transcript retrieval within < 500ms.
  * Server logs show: `Cache hit: Transcript retrieved from Redis for YouTube ID [ID]`.
* **Verification Method:** Inspect Redis CLI (`GET transcript:[youtube_id]`) and monitor backend logs.

---

## 3. Gemini 2.5 Flash Documentation Generation

### TC-GEN-001: Structured 7-Document Generation
* **Description:** Verify that the backend calls Gemini 2.5 Flash and structures the output into exactly 7 documents.
* **Steps:**
  1. Submit a valid YouTube URL.
  2. Wait for the processing stage to finish.
* **Expected Result:**
  * Backend constructs the prompts for: PRD, TRD, SRS, API Docs, Test Cases, DB Schema, Setup Guide.
  * Gemini API returns responses matching the requested schemas.
  * 7 entries are created in the `document_versions` table linked to the `documents` table.
* **Verification Method:** Run SQL query:
  ```sql
  SELECT doc_type, count(*) 
  FROM document_versions 
  WHERE document_id = :doc_id 
  GROUP BY doc_type;
  ```
  *(Expected count: exactly 7 rows returned, one for each doc type)*.

---

## 4. UI Layout, Preview, & Download Test Suite

### TC-UI-001: Dashboard Rendering & Layout
* **Description:** Verify that the screen is laid out correctly with the Chatbot directly below the documents list.
* **Steps:**
  1. Successfully generate documents for a video.
  2. Observe the layout of the generated page.
* **Expected Result:**
  * **Top Section:** Video details (Title, Channel, Duration) and basic customization options.
  * **Middle Section:** A clean tabular list of the 7 generated documents (PRD, TRD, etc.), with buttons for "Preview", "Download PDF", and "Download MD" next to each.
  * **Header of List:** "Download All (ZIP)" button.
  * **Bottom Section:** A messaging interface labeled "Chat with Transcript" is positioned **directly below** the document list.
* **Verification Method:** Browser visual inspection.

---

### TC-UI-002: One-by-One Document Download
* **Description:** Test that individual document download links work correctly.
* **Steps:**
  1. Go to the generated documents table.
  2. Click on the "Download MD" button next to "PRD (Product Requirements Document)".
* **Expected Result:**
  * The browser immediately triggers a download of a file named `[Project_Name]_PRD.md`.
  * Open the downloaded file to verify it contains the full markdown text.
* **Verification Method:** Manual download check.

---

### TC-UI-003: Download All as ZIP
* **Description:** Verify that clicking "Download All" packs all 7 files into a single zip archive.
* **Steps:**
  1. Click the "Download All (ZIP)" button at the top of the list.
* **Expected Result:**
  * Browser downloads a file named `[Project_Name]_documentation.zip`.
  * Extract the zip file and verify it contains exactly 7 markdown files matching the generated documents.
* **Verification Method:** Manual extraction and verification.

---

## 5. Chat with Transcript (Q&A Chatbot) Test Suite

### TC-CHAT-001: Contextual Querying
* **Description:** Verify the chatbot replies based on the transcript's context using Gemini 2.5 Flash.
* **Steps:**
  1. Scroll down to the "Chat with Transcript" section.
  2. Type a specific question: *"What database indexes were recommended in the video?"*
  3. Press Enter or click "Send".
* **Expected Result:**
  * A loading bubble appears.
  * The chatbot returns a detailed reply.
  * The response accurately reflects the video content (verified against raw transcript).
  * The message is saved to the database `chat_messages` table.
* **Verification Method:** UI check and DB query:
  ```sql
  SELECT role, content 
  FROM chat_messages 
  WHERE document_id = :doc_id 
  ORDER BY created_at ASC;
  ```

---

### TC-CHAT-002: Multi-Turn Conversation Context
* **Description:** Ensure the chatbot maintains memory of previous questions.
* **Steps:**
  1. Send message: *"Explain the setup guide mentioned in the video."*
  2. After the bot replies, send a follow-up: *"Can you write a script for step 2?"* (without specifying what step 2 is).
* **Expected Result:**
  * The chatbot understands "step 2" refers to the second step of the setup guide from the previous message.
  * It returns the script matching the context of step 2 of the setup guide.
* **Verification Method:** Chat history verification in UI.

---

### TC-CHAT-003: Out-of-Context Filter
* **Description:** Ensure the chatbot restricts questions to the video/transcript context.
* **Steps:**
  1. Send message: *"What is the recipe for chocolate cake?"*
* **Expected Result:**
  * The chatbot replies politely indicating it cannot answer: *"I am here to help you understand the context of the YouTube video tutorial. Please ask questions related to this video's contents."*
* **Verification Method:** UI test.
