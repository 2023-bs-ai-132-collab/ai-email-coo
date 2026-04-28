// ============================================================
// CONFIGURATION
// ============================================================
const SUPABASE_URL    = "";
const SUPABASE_KEY    = "";
const OPENROUTER_KEY  = "";

// ============================================================
// MAIN FUNCTION
// ============================================================
function checkEmails() {
  var threads = GmailApp.getInboxThreads(0, 10);

  for (var i = 0; i < threads.length; i++) {
    var messages = threads[i].getMessages();
    var msg = messages[messages.length - 1];

    if (msg.isUnread()) {
      var emailData = {
        from_email: msg.getFrom(),
        subject:    msg.getSubject(),
        body:       msg.getPlainBody().substring(0, 500) // ? FIX: limit body to 500 chars to avoid bandwidth error
      };

      Logger.log("??????????????????????????????????????");
      Logger.log("?? New Email: " + emailData.subject);

      // 1. Save RAW email to Supabase
      postToSupabase("/rest/v1/emails", emailData);

      // 2. Get AI Analysis
      try {
        var aiData = analyzeWithOpenRouter(msg.getPlainBody()); // full body only for AI

        // 3. Save INTELLIGENCE to briefings table
        var briefingData = {
          email_subject: emailData.subject,
          summary:       aiData.summary,
          tasks:         aiData.tasks,
          priority:      aiData.priority
        };
        postToSupabase("/rest/v1/briefings", briefingData);

        // 4. ? FIX: Create a proper reply TO THE SENDER (not internal notes)
        var senderName = msg.getFrom().split("<")[0].trim() || "there";
        var draftBody = 
          "Hi " + senderName + ",\n\n" +
          "Thank you for your email regarding \"" + emailData.subject + "\".\n\n" +
          aiData.reply + "\n\n" + 
          "Best regards,\nFarwa";

        msg.getThread().createDraftReply(draftBody);
        Logger.log("?? Draft reply created for sender.");
        Logger.log("?? Priority: " + aiData.priority);
        Logger.log("?? Summary: " + aiData.summary);

      } catch (err) {
        Logger.log("?? AI Error: " + err.message);
      }

      msg.markRead();
      Logger.log("? Done: " + emailData.subject);

      Utilities.sleep(3000); // wait 3s between emails
    }
  }

  Logger.log("?? All emails processed.");
}

// ============================================================
// OPENROUTER AI — Now returns a proper reply too
// ============================================================
function analyzeWithOpenRouter(text) {
  var url = "https://openrouter.ai/api/v1/chat/completions";

  var prompt = "You are an executive assistant. Analyze this email and return ONLY a JSON object with no extra text:\n" +
               "{\n" +
               "  \"summary\": \"1 sentence summary of what this email is about\",\n" +
               "  \"priority\": \"high or medium or low\",\n" +
               "  \"tasks\": [\"action item 1\", \"action item 2\"],\n" +
               "  \"reply\": \"A short professional reply FROM the founder TO the sender. Be polite, concise, and address their message directly. Do NOT mention AI or automation.\"\n" +
               "}\n\n" +
               "Email:\n" + text.substring(0, 3000);

  var payload = {
    model: "openrouter/auto",
    messages: [{ role: "user", content: prompt }]
  };

  var options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "Authorization": "Bearer " + OPENROUTER_KEY,
      "HTTP-Referer": "https://script.google.com",
      "X-Title": "Founder Assistant"
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(url, options);
  var json = JSON.parse(response.getContentText());

  if (response.getResponseCode() === 200) {
    var aiText = json.choices[0].message.content;
    var cleanJson = aiText.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanJson);
  } else {
    throw new Error("OpenRouter Error: " + response.getContentText());
  }
}

// ============================================================
// SUPABASE HELPER
// ============================================================
function postToSupabase(endpoint, payload) {
  var url = SUPABASE_URL.replace(/\/$/, "") + endpoint;
  var options = {
    method: "post",
    contentType: "application/json",
    headers: {
      apikey:        SUPABASE_KEY,
      Authorization: "Bearer " + SUPABASE_KEY,
      Prefer:        "return=minimal"
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(url, options);
  if (response.getResponseCode() > 299) {
    Logger.log("? Supabase Error at " + endpoint + ": " + response.getContentText());
  } else {
    Logger.log("?? Saved to " + endpoint);
  }
}