import { GoogleGenAI, Type } from "@google/genai";

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

export const analyzeExpensePdf = async (pdfFile: File) => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }

  const model = 'gemini-2.5-flash';
  const pdfPart = await fileToGenerativePart(pdfFile);

  const prompt = `
    You are an expert financial analyst. Your task is to analyze the provided bank statement PDF.
    Extract all credit (income, deposits) and debit (expense, withdrawal) transactions. You must extract the date, description, and amount for each transaction. The date must be in YYYY-MM-DD format.
    For each debit transaction, you must assign a category. Use one of the following categories: 'Food & Dining', 'Transportation', 'Shopping', 'Utilities', 'Entertainment', 'Housing', 'Health', 'Other'.
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
    if (error instanceof Error && error.message.includes('json')) {
         throw new Error("Failed to analyze the document. The AI model returned an unexpected format. Please try another document.");
    }
    throw new Error("Failed to analyze the document. This could be a network issue or the PDF is not a valid bank statement.");
  }
};

const getChatSession = () => {
  if (chat) {
    return chat;
  }
  
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }

  const systemInstruction = `You are 'BBaala Assistant', a friendly and helpful guide for the 'BBaala Expense Analyser' web application. Your purpose is to answer user questions about how to use the website. The website allows users to upload a PDF bank statement. It then uses AI to analyze the statement and displays a dashboard with total credit, total debit, and a pie chart breakdown of expenses by category (like Food, Shopping, etc.). Users can view detailed transaction lists, edit categories and descriptions, and export all data to PDF or Excel formats. Keep your answers concise and focused on the website's features. When asked how to use the site, give a simple step-by-step guide.`;

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
