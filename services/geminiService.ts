import { GoogleGenAI, Type } from "@google/genai";

// NEW: Custom error classes for more specific error handling.
export class DocumentAnalysisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DocumentAnalysisError';
  }
}
export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}
export class ApiKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiKeyError';
  }
}

// FIX: Added File type for `file` argument, and specified Promise return type as string.
const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    // FIX: Cast reader.result to string as readAsDataURL returns a string.
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
let chat = null;
let financialChat = null;
let currentSummary = null;

export const analyzeExpensePdf = async (pdfFile: File, categories: string[]) => {
  if (!process.env.API_KEY) {
    throw new ApiKeyError("API_KEY environment variable is not set. Please configure it before retrying.");
  }

  // Reset financial chat when a new PDF is analyzed
  financialChat = null;
  currentSummary = null;

  const model = 'gemini-2.5-flash';
  const pdfPart = await fileToGenerativePart(pdfFile);

  const prompt = `
    You are an expert financial analyst. Your task is to analyze the provided bank statement PDF.
    Extract all credit (income, deposits) and debit (expense, withdrawal) transactions. You must extract the date, description, and amount for each transaction. The date must be in YYYY-MM-DD format.
    For each debit transaction, you must assign a category. Use one of the following categories: ${categories.join(', ')}.
    Calculate the total credit and total debit.
    Provide a summary of total spending per category.
    Return the result in the specified JSON format. Ensure all amounts are positive numbers.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: [pdfPart, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            totalCredit: { type: Type.NUMBER, description: "Total sum of all credit transactions." },
            totalDebit: { type: Type.NUMBER, description: "Total sum of all debit transactions." },
            creditTransactions: {
              type: Type.ARRAY,
              description: "A list of all credit transactions found.",
              items: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING, description: "Date of the transaction in YYYY-MM-DD format." },
                  description: { type: Type.STRING, description: "Description of the credit transaction." },
                  amount: { type: Type.NUMBER, description: "Amount of the credit transaction." },
                },
                required: ["date", "description", "amount"],
              },
            },
            debitTransactions: {
              type: Type.ARRAY,
              description: "A list of all debit transactions found, each with a category.",
              items: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING, description: "Date of the transaction in YYYY-MM-DD format." },
                  description: { type: Type.STRING, description: "Description of the debit transaction." },
                  amount: { type: Type.NUMBER, description: "Amount of the debit transaction." },
                  category: { type: Type.STRING, description: "Category assigned to the debit transaction." },
                },
                 required: ["date", "description", "amount", "category"],
              },
            },
            debitSummary: {
              type: Type.ARRAY,
              description: "A summary of debit transactions grouped by category.",
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING, description: "The expense category." },
                  totalAmount: { type: Type.NUMBER, description: "Total amount spent in this category." },
                },
                required: ["category", "totalAmount"],
              },
            },
          },
          required: ["totalCredit", "totalDebit", "creditTransactions", "debitTransactions", "debitSummary"],
        },
      },
    });

    const jsonText = response.text.trim();
    const parsedJson = JSON.parse(jsonText);

    // Ensure debit amounts are positive for calculation/display consistency
    parsedJson.totalDebit = Math.abs(parsedJson.totalDebit);
    parsedJson.debitTransactions = parsedJson.debitTransactions.map((tx) => ({ ...tx, amount: Math.abs(tx.amount) }));
    parsedJson.debitSummary = parsedJson.debitSummary.map((cat) => ({ ...cat, totalAmount: Math.abs(cat.totalAmount) }));

    return parsedJson;
  } catch (error) {
    console.error("Error analyzing PDF with Gemini API:", error);
    // If parsing fails, it's likely an issue with the document format, which is not retryable.
    if (error instanceof Error && (error.message.includes('json') || error.message.includes('parse'))) {
         throw new DocumentAnalysisError("The AI model returned an unexpected format. This can happen if the document isn't a supported bank statement. Please try another file.");
    }
    // Most other errors are likely transient network or API issues, which are retryable.
    throw new NetworkError("Failed to analyze the document due to a network or API issue. Please check your connection and try again.");
  }
};

export const analyzeReceiptImage = async (base64Image: string, mimeType: string, categories: string[]) => {
  if (!process.env.API_KEY) {
    throw new ApiKeyError("API_KEY is not set.");
  }
  
  const model = 'gemini-2.5-flash';
  const imagePart = { inlineData: { data: base64Image, mimeType } };

  const prompt = `
    Analyze this receipt image. Extract the following information:
    1.  **Merchant Name:** The name of the store or vendor.
    2.  **Transaction Date:** The date of the purchase in YYYY-MM-DD format. If the year is not present, assume the current year.
    3.  **Total Amount:** The final total amount paid.
    4.  **Category:** Suggest the most appropriate category for this expense from the following list: ${categories.join(', ')}.

    Return the result as a single, clean JSON object.
  `;
  
  try {
     const response = await ai.models.generateContent({
      model: model,
      contents: { parts: [imagePart, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING, description: "The name of the merchant or vendor." },
            date: { type: Type.STRING, description: "The transaction date in YYYY-MM-DD format." },
            amount: { type: Type.NUMBER, description: "The total amount of the transaction." },
            category: { type: Type.STRING, description: "The suggested expense category." },
          },
          required: ["description", "date", "amount", "category"],
        },
      },
    });
    
    const jsonText = response.text.trim();
    const parsedJson = JSON.parse(jsonText);
    
    // Validate date format, default to today if invalid
    if (!/^\d{4}-\d{2}-\d{2}$/.test(parsedJson.date)) {
        parsedJson.date = new Date().toISOString().split('T')[0];
    }
    
    // Ensure amount is a positive number
    parsedJson.amount = Math.abs(parseFloat(parsedJson.amount) || 0);

    return parsedJson;
  } catch (error) {
    console.error("Error analyzing receipt image:", error);
     if (error instanceof Error && (error.message.includes('json') || error.message.includes('parse'))) {
         throw new DocumentAnalysisError("The AI model couldn't understand this receipt. Please try a clearer picture.");
    }
    throw new NetworkError("Failed to analyze the receipt due to a network or API issue. Please check your connection and try again.");
  }
};


export const generateQuickSummary = async (debitSummary: any[]) => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  if (!debitSummary || debitSummary.length === 0) {
    return "No debit summary available to analyze.";
  }

  const model = 'gemini-2.5-flash';
  const prompt = `
    You are a helpful financial assistant. Based on the following JSON data of categorized expenses, provide a concise and insightful summary of spending habits for a user.
    
    Your summary should:
    1. Be friendly and encouraging.
    2. Start with a general observation about the spending.
    3. Clearly state the highest spending category and its amount.
    4. Mention one or two other significant spending categories.
    5. Be brief, around 3-4 sentences.
    6. Format the output with paragraphs. Do not use markdown like headers or lists.

    Expense Data:
    ${JSON.stringify(debitSummary)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating quick summary with Gemini API:", error);
    throw new NetworkError("Failed to generate summary due to a network or API issue. Please try again.");
  }
};

export const generateCategorySummary = async (categoryName: string, transactions: any[]) => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  if (!transactions || transactions.length === 0) {
    return `No transactions found for the ${categoryName} category.`;
  }

  const model = 'gemini-2.5-flash';
  const prompt = `
    You are a helpful financial assistant. Analyze the following expense transactions within the "${categoryName}" category.

    Your summary should be:
    1. Concise and insightful, around 2-3 sentences.
    2. Mention the total number of transactions.
    3. Highlight the largest single expense in this category if it's significant.
    4. Provide a brief observation about the spending pattern (e.g., frequent small purchases, a few large ones).
    5. Do not use markdown like headers or lists.

    Transaction Data:
    ${JSON.stringify(transactions.map(tx => ({ date: tx.date, description: tx.description, amount: tx.amount })))}
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error(`Error generating summary for ${categoryName}:`, error);
    throw new NetworkError(`Failed to generate summary for ${categoryName} due to a network or API issue. Please try again.`);
  }
};

const getChatSession = () => {
  if (chat) {
    return chat;
  }
  
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }

  const systemInstruction = `You are 'BBaala Assistant', a friendly and helpful guide for the 'BBaala Expense Analyser' web application. Your purpose is to answer user questions about how to use the website. The website allows users to upload a PDF bank statement. It then uses AI to analyze the statement and displays a dashboard with total credit, total debit, and a pie chart breakdown of expenses by category (like Food, Shopping, etc.). Users can view detailed transaction lists, edit categories and descriptions, export data, and scan receipts with their camera to add new expenses. Keep your answers concise and focused on the website's features. When asked how to use the site, give a simple step-by-step guide.`;

  chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: systemInstruction,
    },
  });
  return chat;
}

export const sendMessage = async (message) => {
  try {
    const chatSession = getChatSession();
    const response = await chatSession.sendMessage({ message });
    return response.text;
  } catch (error) {
    console.error("Error sending message to Gemini API:", error);
    chat = null; // Reset chat on error
    return "Sorry, I encountered an error. Please try again.";
  }
};

const getFinancialCopilotSession = (summary) => {
  if (financialChat && currentSummary === summary) {
    return financialChat;
  }

  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  
  currentSummary = summary;
  const systemInstruction = `You are a financial copilot. The user has provided their financial summary in JSON format. Your task is to answer questions based ONLY on this data. Do not make up information. Be helpful and provide insights, calculations, and summaries as requested. Here is the user's financial data: ${JSON.stringify(summary)}`;

  financialChat = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction,
    },
  });

  return financialChat;
}

export const askFinancialCopilot = async (message, summary) => {
  try {
    const chatSession = getFinancialCopilotSession(summary);
    const response = await chatSession.sendMessage({ message });
    return response.text;
  } catch (error) {
    console.error("Error with Financial Copilot:", error);
    financialChat = null; // Reset chat on error
    currentSummary = null;
    return "Sorry, I encountered an error. Please try asking your question again.";
  }
};