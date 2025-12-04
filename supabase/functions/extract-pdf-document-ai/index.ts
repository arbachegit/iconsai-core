import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TableCell {
  text: string;
  rowIndex: number;
  colIndex: number;
}

interface ExtractedTable {
  headers: string[];
  rows: string[][];
  markdownTable: string;
}

// Get Google Cloud access token using service account
async function getAccessToken(credentials: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600;

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: expiry,
  };

  // Base64url encode
  const base64url = (obj: any) => {
    const json = JSON.stringify(obj);
    const base64 = btoa(json);
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  };

  const headerEncoded = base64url(header);
  const payloadEncoded = base64url(payload);
  const signatureInput = `${headerEncoded}.${payloadEncoded}`;

  // Import the private key
  const pemContents = credentials.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");

  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  // Sign the JWT
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );

  const signatureEncoded = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  const jwt = `${signatureInput}.${signatureEncoded}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error(`Failed to get access token: ${JSON.stringify(tokenData)}`);
  }

  return tokenData.access_token;
}

// Convert table cells to markdown
function tablesToMarkdown(tables: ExtractedTable[]): string {
  return tables.map((table, idx) => {
    let md = `\n### Tabela ${idx + 1}\n\n`;
    md += table.markdownTable;
    return md;
  }).join("\n");
}

// Parse Document AI response for tables
function extractTablesFromResponse(document: any): ExtractedTable[] {
  const tables: ExtractedTable[] = [];
  
  if (!document.pages) return tables;

  for (const page of document.pages) {
    if (!page.tables) continue;

    for (const table of page.tables) {
      const extractedTable: ExtractedTable = {
        headers: [],
        rows: [],
        markdownTable: "",
      };

      // Extract header row
      if (table.headerRows && table.headerRows.length > 0) {
        for (const headerRow of table.headerRows) {
          const headerCells: string[] = [];
          if (headerRow.cells) {
            for (const cell of headerRow.cells) {
              const cellText = extractTextFromLayout(cell.layout, document.text);
              headerCells.push(cellText.trim());
            }
          }
          if (headerCells.length > 0) {
            extractedTable.headers = headerCells;
          }
        }
      }

      // Extract body rows
      if (table.bodyRows) {
        for (const bodyRow of table.bodyRows) {
          const rowCells: string[] = [];
          if (bodyRow.cells) {
            for (const cell of bodyRow.cells) {
              const cellText = extractTextFromLayout(cell.layout, document.text);
              rowCells.push(cellText.trim());
            }
          }
          if (rowCells.length > 0) {
            extractedTable.rows.push(rowCells);
          }
        }
      }

      // Generate markdown table
      if (extractedTable.headers.length > 0 || extractedTable.rows.length > 0) {
        const headers = extractedTable.headers.length > 0 
          ? extractedTable.headers 
          : extractedTable.rows[0] || [];
        
        let markdown = "| " + headers.join(" | ") + " |\n";
        markdown += "| " + headers.map(() => "---").join(" | ") + " |\n";
        
        const dataRows = extractedTable.headers.length > 0 
          ? extractedTable.rows 
          : extractedTable.rows.slice(1);
        
        for (const row of dataRows) {
          // Pad row to match header length
          while (row.length < headers.length) {
            row.push("");
          }
          markdown += "| " + row.join(" | ") + " |\n";
        }
        
        extractedTable.markdownTable = markdown;
        tables.push(extractedTable);
      }
    }
  }

  return tables;
}

// Extract text from layout segment
function extractTextFromLayout(layout: any, fullText: string): string {
  if (!layout || !layout.textAnchor || !layout.textAnchor.textSegments) {
    return "";
  }

  let text = "";
  for (const segment of layout.textAnchor.textSegments) {
    const startIndex = parseInt(segment.startIndex || "0");
    const endIndex = parseInt(segment.endIndex || "0");
    text += fullText.substring(startIndex, endIndex);
  }
  return text;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const projectId = Deno.env.get("GOOGLE_CLOUD_PROJECT_ID");
    const location = Deno.env.get("GOOGLE_CLOUD_LOCATION") || "us";
    const credentialsJson = Deno.env.get("GOOGLE_CLOUD_CREDENTIALS");

    if (!projectId || !credentialsJson) {
      throw new Error("Missing Google Cloud configuration");
    }

    const credentials = JSON.parse(credentialsJson);
    const { pdf_base64, filename } = await req.json();

    if (!pdf_base64) {
      throw new Error("Missing pdf_base64 in request body");
    }

    console.log(`Processing PDF with Document AI: ${filename}`);

    // Get access token
    const accessToken = await getAccessToken(credentials);

    // Use the general document processor
    // You need to create a processor in Google Cloud Console first
    // For now, we'll use the inline processing endpoint
    const processorEndpoint = `https://${location}-documentai.googleapis.com/v1/projects/${projectId}/locations/${location}/processors`;

    // List processors to find Document OCR processor
    const listResponse = await fetch(processorEndpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const processorsList = await listResponse.json();
    console.log("Available processors:", JSON.stringify(processorsList, null, 2));

    // Find the first processor or use default OCR
    let processorName = "";
    if (processorsList.processors && processorsList.processors.length > 0) {
      // Prefer FORM_PARSER or DOCUMENT_OCR_PROCESSOR
      const formParser = processorsList.processors.find(
        (p: any) => p.type === "FORM_PARSER_PROCESSOR" || p.type === "DOCUMENT_OCR_PROCESSOR"
      );
      processorName = formParser?.name || processorsList.processors[0].name;
    }

    if (!processorName) {
      // If no processor exists, return error with instructions
      return new Response(
        JSON.stringify({
          error: "No Document AI processor found",
          instructions: "Please create a processor in Google Cloud Console: Cloud Console > Document AI > Create Processor > Select 'Document OCR' or 'Form Parser'",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Using processor: ${processorName}`);

    // Process the document
    const processResponse = await fetch(`https://${location}-documentai.googleapis.com/v1/${processorName}:process`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rawDocument: {
          content: pdf_base64,
          mimeType: "application/pdf",
        },
        skipHumanReview: true,
      }),
    });

    if (!processResponse.ok) {
      const errorText = await processResponse.text();
      console.error("Document AI error:", errorText);
      throw new Error(`Document AI API error: ${processResponse.status} - ${errorText}`);
    }

    const result = await processResponse.json();
    console.log("Document AI processing complete");

    // Extract full text
    const fullText = result.document?.text || "";

    // Extract tables
    const tables = extractTablesFromResponse(result.document);
    console.log(`Extracted ${tables.length} tables`);

    // Combine text with table markdown
    let enrichedText = fullText;
    if (tables.length > 0) {
      enrichedText += "\n\n## DADOS TABULARES EXTRAÍDOS\n";
      enrichedText += tablesToMarkdown(tables);
    }

    // Calculate statistics
    const wordCount = enrichedText.split(/\s+/).filter(Boolean).length;
    const tableCount = tables.length;
    const totalTableRows = tables.reduce((sum, t) => sum + t.rows.length, 0);

    return new Response(
      JSON.stringify({
        success: true,
        text: enrichedText,
        tables: tables,
        statistics: {
          wordCount,
          tableCount,
          totalTableRows,
          originalTextLength: fullText.length,
          enrichedTextLength: enrichedText.length,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in extract-pdf-document-ai:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
