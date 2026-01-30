import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = import.meta.env.VITE_GEMINI_API_KEY

if (!apiKey) {
  console.warn('Gemini API key not found')
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null

export interface ParsedExpense {
  description: string
  amount: number
  category: string
  splitType: 'equal' | 'exact'
  confidence: number
}

export interface ExpenseParseResult {
  success: boolean
  expense?: ParsedExpense
  error?: string
  rawResponse?: string
}

const EXPENSE_PARSER_PROMPT = `You are an expense parsing assistant. Parse the user's voice command into structured expense data.

Categories available: food, utilities, travel, entertainment, shopping, health, education, miscellaneous

Extract:
1. description: What was purchased/paid for
2. amount: The monetary amount (in INR)
3. category: One of the categories above
4. splitType: "equal" for splitting equally, "exact" for custom amounts

Respond ONLY with valid JSON in this format:
{
  "description": "string",
  "amount": number,
  "category": "string",
  "splitType": "equal" | "exact",
  "confidence": number (0-1)
}

If you cannot parse the expense, respond with:
{
  "error": "reason"
}

Examples:
- "Add 500 for dinner" -> {"description": "dinner", "amount": 500, "category": "food", "splitType": "equal", "confidence": 0.95}
- "Split 1200 for electricity bill" -> {"description": "electricity bill", "amount": 1200, "category": "utilities", "splitType": "equal", "confidence": 0.9}
- "Paid 2000 for movie tickets" -> {"description": "movie tickets", "amount": 2000, "category": "entertainment", "splitType": "equal", "confidence": 0.9}
`

export async function parseExpenseFromVoice(transcript: string): Promise<ExpenseParseResult> {
  if (!genAI) {
    return {
      success: false,
      error: 'Gemini API not configured',
    }
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

    const result = await model.generateContent([
      EXPENSE_PARSER_PROMPT,
      `User said: "${transcript}"`,
    ])

    const response = result.response.text()

    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return {
        success: false,
        error: 'Could not parse response',
        rawResponse: response,
      }
    }

    const parsed = JSON.parse(jsonMatch[0])

    if (parsed.error) {
      return {
        success: false,
        error: parsed.error,
        rawResponse: response,
      }
    }

    return {
      success: true,
      expense: {
        description: parsed.description,
        amount: parsed.amount,
        category: parsed.category || 'miscellaneous',
        splitType: parsed.splitType || 'equal',
        confidence: parsed.confidence || 0.8,
      },
      rawResponse: response,
    }
  } catch (error) {
    console.error('Gemini API error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse expense',
    }
  }
}

export interface InsightResult {
  insights: string[]
  tips: string[]
}

const INSIGHTS_PROMPT = `You are a financial insights assistant. Analyze the user's spending data and provide helpful insights.

Provide 2-3 short, actionable insights about their spending patterns.
Also provide 1-2 money-saving tips based on their expenses.

Respond in JSON format:
{
  "insights": ["insight 1", "insight 2"],
  "tips": ["tip 1", "tip 2"]
}

Keep each insight/tip under 100 characters. Be specific and helpful.
`

export async function generateSpendingInsights(
  expenses: { amount: number; category: string; description: string }[],
  monthlyBudget?: number
): Promise<InsightResult> {
  if (!genAI) {
    return {
      insights: ['Connect Gemini AI for personalized insights'],
      tips: ['Track your expenses regularly'],
    }
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0)
    const categoryTotals: Record<string, number> = {}

    expenses.forEach((e) => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount
    })

    const spendingData = `
Total spent: ₹${totalSpent}
${monthlyBudget ? `Monthly budget: ₹${monthlyBudget}` : ''}
Number of expenses: ${expenses.length}
Category breakdown: ${JSON.stringify(categoryTotals)}
Recent expenses: ${expenses.slice(0, 5).map((e) => `₹${e.amount} on ${e.description}`).join(', ')}
`

    const result = await model.generateContent([
      INSIGHTS_PROMPT,
      spendingData,
    ])

    const response = result.response.text()
    const jsonMatch = response.match(/\{[\s\S]*\}/)

    if (!jsonMatch) {
      return {
        insights: ['Track your spending patterns over time'],
        tips: ['Set category budgets to control spending'],
      }
    }

    const parsed = JSON.parse(jsonMatch[0])
    return {
      insights: parsed.insights || [],
      tips: parsed.tips || [],
    }
  } catch (error) {
    console.error('Gemini API error:', error)
    return {
      insights: ['Unable to generate insights'],
      tips: ['Try again later'],
    }
  }
}

export async function processVoiceCommand(
  transcript: string
): Promise<{
  type: 'add_expense' | 'query' | 'settle' | 'unknown'
  data?: ParsedExpense
  response?: string
}> {
  if (!genAI) {
    return { type: 'unknown', response: 'AI not configured' }
  }

  const lowerTranscript = transcript.toLowerCase()

  // Check for expense-related keywords
  if (
    lowerTranscript.includes('add') ||
    lowerTranscript.includes('spent') ||
    lowerTranscript.includes('paid') ||
    lowerTranscript.includes('split') ||
    /\d+/.test(transcript)
  ) {
    const result = await parseExpenseFromVoice(transcript)
    if (result.success && result.expense) {
      return {
        type: 'add_expense',
        data: result.expense,
      }
    }
  }

  // Check for query keywords
  if (
    lowerTranscript.includes('how much') ||
    lowerTranscript.includes('owe') ||
    lowerTranscript.includes('balance') ||
    lowerTranscript.includes('show')
  ) {
    return {
      type: 'query',
      response: 'I can help you check your balance. Let me fetch that for you.',
    }
  }

  // Check for settle keywords
  if (
    lowerTranscript.includes('settle') ||
    lowerTranscript.includes('pay back')
  ) {
    return {
      type: 'settle',
      response: 'I can help you settle up. Let me show the settlement options.',
    }
  }

  return {
    type: 'unknown',
    response: "I didn't understand that. Try saying something like 'Add 500 for dinner' or 'How much do I owe?'",
  }
}
