/**
 * Invitation Channel Rules Engine
 * 
 * CRITICAL BUSINESS RULES:
 * - PWA-only (hasAppAccess=true, hasPlatformAccess=false): WhatsApp ONLY, Email FORBIDDEN
 * - Platform-only: Email and/or WhatsApp allowed
 * - Both: Email for Platform, WhatsApp for both (or both channels)
 */

export interface ChannelRuleParams {
  hasAppAccess: boolean;
  hasPlatformAccess: boolean;
  hasPhone: boolean;
}

export interface AllowedChannels {
  email: boolean;
  whatsapp: boolean;
  both: boolean;
}

export interface ForcedChannelResult {
  forcedChannel: "whatsapp" | null;
  reason: string | null;
}

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Determines which channels are allowed based on product access
 */
export function getAllowedChannels(params: ChannelRuleParams): AllowedChannels {
  const { hasAppAccess, hasPlatformAccess, hasPhone } = params;
  
  // PWA-only: WhatsApp ONLY
  if (hasAppAccess && !hasPlatformAccess) {
    return {
      email: false,
      whatsapp: hasPhone,
      both: false
    };
  }
  
  // Platform-only or Both: all channels available
  return {
    email: true,
    whatsapp: hasPhone,
    both: hasPhone
  };
}

/**
 * Returns the forced channel if rules require it
 */
export function getForcedChannels(params: ChannelRuleParams): ForcedChannelResult {
  const { hasAppAccess, hasPlatformAccess } = params;
  
  // PWA-only: MUST use WhatsApp
  if (hasAppAccess && !hasPlatformAccess) {
    return {
      forcedChannel: "whatsapp",
      reason: "Convites de APP são enviados exclusivamente via WhatsApp"
    };
  }
  
  return {
    forcedChannel: null,
    reason: null
  };
}

/**
 * Validates channel selection against rules
 */
export function getValidationErrors(params: ChannelRuleParams & {
  selectedChannel: "email" | "whatsapp" | "both";
}): ValidationError[] {
  const errors: ValidationError[] = [];
  const { hasAppAccess, hasPlatformAccess, hasPhone, selectedChannel } = params;
  
  // PWA-only validations
  if (hasAppAccess && !hasPlatformAccess) {
    if (selectedChannel === "email" || selectedChannel === "both") {
      errors.push({
        field: "channel",
        message: "Email não é permitido para convites de APP. Utilize apenas WhatsApp."
      });
    }
    
    if (!hasPhone) {
      errors.push({
        field: "phone",
        message: "Telefone é obrigatório para convites de APP."
      });
    }
  }
  
  // WhatsApp requires phone
  if ((selectedChannel === "whatsapp" || selectedChannel === "both") && !hasPhone) {
    errors.push({
      field: "phone",
      message: "Telefone é necessário para envio via WhatsApp."
    });
  }
  
  return errors;
}

/**
 * Determines if a product selection is PWA-only
 */
export function isPwaOnly(product: "platform" | "app" | "both"): boolean {
  return product === "app";
}

/**
 * Get the display label for channel availability
 */
export function getChannelAvailabilityLabel(
  channel: "email" | "whatsapp" | "both",
  allowed: AllowedChannels
): string {
  if (channel === "email" && !allowed.email) return "N/A";
  if (channel === "whatsapp" && !allowed.whatsapp) return "Sem telefone";
  if (channel === "both" && !allowed.both) return "N/A";
  return "";
}
