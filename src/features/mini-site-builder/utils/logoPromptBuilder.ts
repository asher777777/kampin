/**
 * Logo Prompt Builder Utility
 * Consolidates full brand context to engineer a precise, clean vector logo prompt
 */

export interface BrandLogoContext {
  companyName: string;
  slogan?: string;
  businessProblem?: string;
  companyVision?: string;
  personas?: string[];
  services?: string[];
  preferredStyle?: string;
}

export function buildLogoPrompt(context: BrandLogoContext): string {
  const {
    companyName,
    slogan,
    businessProblem,
    companyVision,
    personas,
    services,
    preferredStyle = "modern minimalist"
  } = context;

  const problemContext = businessProblem ? ` representing solution for "${businessProblem}"` : "";
  const visionContext = companyVision ? `, inspired by vision "${companyVision.slice(0, 100)}"` : "";
  const personaContext = personas && personas.length > 0 ? `, tailored for audience interested in ${personas.join(", ")}` : "";
  const serviceContext = services && services.length > 0 ? `, reflecting core services: ${services.join(", ")}` : "";

  return `Professional ${preferredStyle} vector logo icon for company "${companyName}"${slogan ? ` with slogan "${slogan}"` : ""}${problemContext}${visionContext}${personaContext}${serviceContext}. Flat design, clean geometry, iconic graphic symbol, vibrant corporate identity, studio lighting, vector style, isolated on clean solid background, high resolution, 8k quality, sharp details, no text distortion.`;
}
