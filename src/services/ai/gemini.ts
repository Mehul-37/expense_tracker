import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = import.meta.env.VITE_GEMINI_API_KEY

if (!apiKey) {
  console.warn('Gemini API key not found. Set VITE_GEMINI_API_KEY in .env')
} else {
  console.log('Gemini API key loaded:', apiKey.substring(0, 10) + '...')
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

const EXPENSE_PARSER_PROMPT = `You are an expense parsing assistant for an Indian expense tracking app. Parse the user's voice command into structured expense data.

IMPORTANT: The input comes from speech recognition which may have errors, mishearings, or partial words. Be flexible and try to understand the intent even with imperfect transcription.

Categories available: food, utilities, travel, entertainment, shopping, health, education, miscellaneous

Common Indian terms to recognize:
- Food: chai, samosa, biryani, thali, dosa, paratha, Zomato, Swiggy, Dominos, Pizza Hut, mess, canteen, dhaba
- Travel: auto, rickshaw, Ola, Uber, metro, bus, petrol, diesel, parking
- Utilities: bijli (electricity), pani (water), WiFi, internet, recharge, mobile
- Shopping: Amazon, Flipkart, Myntra, clothes, groceries, kirana
- Entertainment: Netflix, movies, PVR, INOX, Hotstar

Amount recognition:
- "5 hundred" = 500, "1 thousand" = 1000, "1.5k" = 1500
- Numbers may be misheard: "fight hundred" = "five hundred" = 500

Extract:
1. description: What was purchased/paid for (clean up the description)
2. amount: The monetary amount (in INR) - extract numbers even if spoken oddly
3. category: Best matching category from above
4. splitType: "equal" for splitting equally, "exact" for custom amounts

Respond ONLY with valid JSON in this format:
{
  "description": "string",
  "amount": number,
  "category": "string",
  "splitType": "equal" | "exact",
  "confidence": number (0-1)
}

If you truly cannot parse any expense information, respond with:
{
  "error": "reason"
}

Examples:
- "Add 500 for dinner" -> {"description": "dinner", "amount": 500, "category": "food", "splitType": "equal", "confidence": 0.95}
- "Split 1200 for electricity bill" -> {"description": "electricity bill", "amount": 1200, "category": "utilities", "splitType": "equal", "confidence": 0.9}
- "Paid 2000 for movie tickets" -> {"description": "movie tickets", "amount": 2000, "category": "entertainment", "splitType": "equal", "confidence": 0.9}
- "split 1200 for dinner at Dominos with the roomies" -> {"description": "Dominos dinner", "amount": 1200, "category": "food", "splitType": "equal", "confidence": 0.95}
- "spent fight hundred on auto" -> {"description": "auto ride", "amount": 500, "category": "travel", "splitType": "equal", "confidence": 0.85}
- "1.5k for groceries" -> {"description": "groceries", "amount": 1500, "category": "shopping", "splitType": "equal", "confidence": 0.9}
`

// Fallback regex-based parser for when Gemini API is unavailable
function parseExpenseLocally(transcript: string): ParsedExpense | null {
  const lower = transcript.toLowerCase()

  // Extract amount using various patterns
  let amount: number | null = null

  // Pattern: "500", "1000", "1500"
  const numMatch = transcript.match(/(\d+(?:\.\d+)?)\s*(?:k|K)?/)
  if (numMatch) {
    amount = parseFloat(numMatch[1])
    // Handle "k" suffix (1.5k = 1500)
    if (lower.includes('k') && amount < 100) {
      amount *= 1000
    }
  }

  // Pattern: "five hundred", "two thousand"
  const wordNumbers: Record<string, number> = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
    'fight': 5, 'tree': 3, // common mishearings
  }

  if (!amount) {
    for (const [word, num] of Object.entries(wordNumbers)) {
      if (lower.includes(word + ' hundred')) {
        amount = num * 100
        break
      }
      if (lower.includes(word + ' thousand')) {
        amount = num * 1000
        break
      }
    }
  }

  if (!amount) return null

  // Extract description - text after "for" or "on"
  let description = 'expense'
  const forMatch = transcript.match(/(?:for|on)\s+(.+?)(?:\s+with|\s+at|\s*$)/i)
  if (forMatch) {
    description = forMatch[1].trim()
  } else {
    // Try to get description from common patterns
    const descPatterns = [
      /(?:add|paid|spent|split)\s+\d+\s+(?:for|on)\s+(.+)/i,
      /(.+?)\s+\d+/i,
    ]
    for (const pattern of descPatterns) {
      const match = transcript.match(pattern)
      if (match && match[1]) {
        description = match[1].replace(/^(?:add|paid|spent|split)\s*/i, '').trim()
        if (description) break
      }
    }
  }

  // Clean up description
  description = description.replace(/^\s*(for|on|at)\s*/i, '').trim() || 'expense'

  // Detect category from keywords
  const categoryKeywords: Record<string, string[]> = {
    food: ['dinner', 'lunch', 'breakfast', 'food', 'meal', 'eat', 'pizza', 'dominos', 'zomato', 'swiggy', 'biryani', 'chai', 'coffee', 'snack', 'restaurant'],
    travel: ['uber', 'ola', 'auto', 'cab', 'taxi', 'metro', 'bus', 'petrol', 'diesel', 'parking', 'ride', 'travel'],
    utilities: ['electricity', 'water', 'wifi', 'internet', 'bill', 'recharge', 'mobile', 'phone', 'rent', 'gas'],
    entertainment: ['movie', 'movies', 'netflix', 'hotstar', 'pvr', 'inox', 'game', 'concert'],
    shopping: ['amazon', 'flipkart', 'myntra', 'clothes', 'groceries', 'grocery', 'shopping', 'kirana'],
    health: ['medicine', 'doctor', 'hospital', 'pharmacy', 'gym', 'health'],
  }

  let category = 'miscellaneous'
  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(kw => lower.includes(kw))) {
      category = cat
      break
    }
  }

  return {
    description,
    amount,
    category,
    splitType: lower.includes('split') ? 'equal' : 'equal',
    confidence: 0.75,
  }
}

export async function parseExpenseFromVoice(transcript: string): Promise<ExpenseParseResult> {
  // First try local parsing as fallback
  const localResult = parseExpenseLocally(transcript)

  if (!genAI) {
    // No API - use local parser
    if (localResult) {
      return {
        success: true,
        expense: localResult,
      }
    }
    return {
      success: false,
      error: 'Could not parse expense',
    }
  }

  try {
    console.log('Calling Gemini API with transcript:', transcript)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const result = await model.generateContent([
      EXPENSE_PARSER_PROMPT,
      `User said: "${transcript}"`,
    ])

    const response = result.response.text()
    console.log('Gemini API response:', response)

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
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    // Fallback to local parser when API fails
    if (localResult) {
      console.log('Using local fallback parser instead')
      return {
        success: true,
        expense: localResult,
      }
    }
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
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

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
  const lowerTranscript = transcript.toLowerCase()

  // Expense-related keywords (expanded for Indian English and common mishearings)
  const expenseKeywords = [
    'add', 'spent', 'paid', 'pay', 'split', 'buy', 'bought', 'purchase',
    'order', 'ordered', 'book', 'booked', 'expense', 'cost',
    'rupees', 'rupee', 'rs', 'inr', 'hundred', 'thousand', 'lakh',
    'for', 'on', 'at', // prepositions often used with expenses
    'dinner', 'lunch', 'breakfast', 'food', 'grocery', 'groceries',
    'uber', 'ola', 'auto', 'cab', 'taxi', 'metro', 'bus',
    'dominos', 'domino', 'pizza', 'zomato', 'swiggy',
    'amazon', 'flipkart', 'myntra',
    'netflix', 'movie', 'movies',
    'recharge', 'bill', 'rent', 'electricity', 'water', 'wifi',
  ]

  // Check if any expense keyword is present or if there's a number
  const hasExpenseKeyword = expenseKeywords.some(keyword =>
    lowerTranscript.includes(keyword)
  )
  const hasNumber = /\d+/.test(transcript) ||
    lowerTranscript.includes('hundred') ||
    lowerTranscript.includes('thousand') ||
    lowerTranscript.includes('k ') ||
    lowerTranscript.endsWith('k')

  if (hasExpenseKeyword || hasNumber) {
    const result = await parseExpenseFromVoice(transcript)
    if (result.success && result.expense) {
      return {
        type: 'add_expense',
        data: result.expense,
      }
    }
    // Even if parsing partially failed, if there was a number, try harder
    if (hasNumber && result.error) {
      return {
        type: 'unknown',
        response: `I heard "${transcript}" but couldn't fully understand. Try: "Add [amount] for [description]"`,
      }
    }
  }

  // Check for query keywords
  if (
    lowerTranscript.includes('how much') ||
    lowerTranscript.includes('owe') ||
    lowerTranscript.includes('balance') ||
    lowerTranscript.includes('show') ||
    lowerTranscript.includes('total') ||
    lowerTranscript.includes('kitna') // Hindi
  ) {
    return {
      type: 'query',
      response: 'I can help you check your balance. Let me fetch that for you.',
    }
  }

  // Check for settle keywords
  if (
    lowerTranscript.includes('settle') ||
    lowerTranscript.includes('pay back') ||
    lowerTranscript.includes('clear') ||
    lowerTranscript.includes('dues')
  ) {
    return {
      type: 'settle',
      response: 'I can help you settle up. Let me show the settlement options.',
    }
  }

  return {
    type: 'unknown',
    response: `I heard "${transcript}". Try saying: "Add 500 for dinner" or "Split 1000 for groceries"`,
  }
}
