export default async function handler(req, res) {
  // Only allow your Chrome extension
  const allowedOrigins = [
    "chrome-extension://lfmnppelgijoodkefobgdijajmblibge",
    "chrome-extension://fhlkhckjdbmcgbignfjdjfdepcknmlej",
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    return res.status(403).json({ error: "Forbidden - Unauthorized origin" });
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { htmlContent, url } = req.body;

    if (!htmlContent) {
      return res.status(400).json({ error: "HTML content is required" });
    }

    // Extract clean text content
    const cleanText = htmlContent
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 8000);

    console.log("🔍 Clean text:", cleanText);

    const prompt = `Here is the provided listing details:
${cleanText}

You are a data extraction tool. Analyze this real estate listing and output ONLY the property information as JSON. Here are the fields you need to output:

- price: Main listing price as number (remove commas and currency symbols)
- address: Full address string
- propertyType: Type like "Single Family", "Multi-Family", "Duplex", "Triplex", "Condo", "Apartment", etc.
- bedrooms: Total bedrooms as number
- bathrooms: Bathrooms as number (can be decimal)
- sqft: Square footage as number (null if not available)
- propertyTax: MONTHLY property tax amount (MUST estimate if not found in the listing details using rules below)
- insurance: MONTHLY insurance amount (MUST estimate if not found in the listing details using rules below)
- hoaFees: MONTHLY HOA/condo fees (MUST estimate if not found in the listing details using rules below)
- monthlyRent: Estimated monthly rent based on property price, type, and characteristics (MUST estimate using rules below)
- interestRate: Estimated current mortgage interest rate (MUST estimate using rules below)

ESTIMATION RULES:

propertyTax:
Calculate as: (property_price × annual_tax_rate ÷ 100) ÷ 12

Annual tax rates by property type and value:
- Single Family homes: 0.6-1.% (use 0.8% as default)
- Condos/Apartments: 0.9-1.3% (use 1.1% as default)  
- Townhouses: 0.8-1.1% (use 0.95% as default)
- Luxury properties (>$1M): 1.0-1.5% (use 1.2% as default)
- Lower-value properties (<$300K): 0.6-1.0% (use 0.8% as default)
- General default: 1.0% if property type unclear

insurance:
Calculate as: (property_price × annual_insurance_rate ÷ 100) ÷ 12

Annual insurance rates:
- Properties under $400K: 0.25% of value
- Properties $400K-$800K: 0.30% of value
- Properties over $800K: 0.35% of value

hoaFees:
- Single Family: $0 (no HOA fees typically)
- Townhouse: $100-300/month based on value:
 - Under $400K: $100/month
 - $400K-$800K: $200/month
 - Over $800K: $300/month
- Condo/Apartment: $200-600/month based on value:
 - Under $400K: $200/month
 - $400K-700K: $350/month
 - Over $700K: $500/month

monthlyRent:
Calculate as: property_price × monthly_rent_ratio ÷ 100

For the monthly_rent_ratio, determine if the address is in a high-cost, medium-cost, or lower-cost market.

HIGH-COST MARKETS:
- Single Family: 0.4% of property value
- Multi-Family (4+ units): 0.6% of property value
- Townhouse: 0.5% of property value  
- Condo 1-2 bed: 0.5% of property value
- Condo 3+ bed: 0.4% of property value
- Apartment: 0.6% of property value
- Duplex: 0.5% of property value
- Triplex: 0.6% of property value

MEDIUM-COST MARKETS:
- Single Family: 0.7% of property value
- Multi-Family (4+ units): 0.9% of property value
- Townhouse: 0.8% of property value  
- Condo 1-2 bed: 0.8% of property value
- Condo 3+ bed: 0.7% of property value
- Apartment: 0.9% of property value
- Duplex: 0.8% of property value
- Triplex: 0.9% of property value

LOWER-COST MARKETS:
- Single Family: 1.0% of property value
- Multi-Family (4+ units): 1.3% of property value
- Townhouse: 1.1% of property value  
- Condo 1-2 bed: 1.1% of property value
- Condo 3+ bed: 1.0% of property value
- Apartment: 1.2% of property value
- Duplex: 1.1% of property value
- Triplex: 1.3% of property value

interestRate:
- US properties: 6.5%
- Canadian properties: 4.0%
- Determine country from address or URL (.ca = Canada)`;

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1000,
          temperature: 0.0,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Groq API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const result = await response.json();
    const aiResponse = result.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error("No response from Groq API");
    }

    // Parse the JSON response
    let propertyData;
    try {
      propertyData = JSON.parse(aiResponse);
    } catch (parseError) {
      // Try to extract JSON from response if it's wrapped in other text
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          propertyData = JSON.parse(jsonMatch[0]);
        } catch {
          throw new Error("Failed to parse AI response");
        }
      } else {
        throw new Error("No valid JSON found in AI response");
      }
    }

    // Add URL to the data
    const finalData = {
      ...propertyData,
      url,
    };

    res.json({
      success: true,
      propertyData: finalData,
    });
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
