export const Constants = {
    SLASH: '/' as const,
    Slash: '/' as const,
    IDEA: 'idea' as const,
    Idea: 'idea' as const,
    HEALTH: 'health' as const,
    Health: 'health' as const,
    API_V1: 'api/v1' as const,
    ApiV1: 'api/v1' as const,
  } as const;
  
  export const Prefix = {
    IdeaApiV1: `${Constants.SLASH}${Constants.IDEA}${Constants.SLASH}${Constants.API_V1}` as const,
    HealthApiV1: `${Constants.SLASH}${Constants.HEALTH}${Constants.SLASH}${Constants.API_V1}` as const,
  } as const;
  
  export default Constants;