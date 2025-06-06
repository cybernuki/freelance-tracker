/**
 * Utility functions for quote price calculations
 */

/**
 * Calculate the minimum price including AI messages for requirements analysis
 * @param baseMilestonePrice - Base price from milestones/issues
 * @param aiMessagesUsedForRequirements - Number of AI messages used for requirements analysis
 * @param aiMessageRate - Rate per AI message
 * @returns Total minimum price including AI messages cost
 */
export function calculateMinimumPrice(
  baseMilestonePrice: number,
  aiMessagesUsedForRequirements: number = 0,
  aiMessageRate: number = 0.08
): number {
  const aiMessagesCost = aiMessagesUsedForRequirements * aiMessageRate
  return baseMilestonePrice + aiMessagesCost
}

/**
 * Calculate the AI messages cost for requirements analysis
 * @param aiMessagesUsed - Number of AI messages used
 * @param aiMessageRate - Rate per AI message
 * @returns Total cost for AI messages
 */
export function calculateAiMessagesCost(
  aiMessagesUsed: number = 0,
  aiMessageRate: number = 0.08
): number {
  return aiMessagesUsed * aiMessageRate
}

/**
 * Calculate recommended price with profit margin
 * @param minimumPrice - Minimum price (already includes AI messages)
 * @param profitMarginPercentage - Profit margin percentage
 * @returns Recommended price with profit
 */
export function calculateRecommendedPrice(
  minimumPrice: number,
  profitMarginPercentage: number = 20
): number {
  const profitAmount = minimumPrice * (profitMarginPercentage / 100)
  return minimumPrice + profitAmount
}

/**
 * Get the base milestone price (without AI messages for requirements)
 * @param totalMinimumPrice - Total minimum price including AI messages
 * @param aiMessagesUsedForRequirements - Number of AI messages used for requirements
 * @param aiMessageRate - Rate per AI message
 * @returns Base milestone price
 */
export function getBaseMilestonePrice(
  totalMinimumPrice: number,
  aiMessagesUsedForRequirements: number = 0,
  aiMessageRate: number = 0.08
): number {
  const aiMessagesCost = aiMessagesUsedForRequirements * aiMessageRate
  return Math.max(0, totalMinimumPrice - aiMessagesCost)
}
