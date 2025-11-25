import { FEATURE_FLAGS } from "@/lib/environment";

/**
 * Hook to access feature flags throughout the application
 */
export const useFeatureFlags = () => {
  return FEATURE_FLAGS;
};
