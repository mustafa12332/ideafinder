import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  
  // Reddit API Configuration
  REDDIT_CLIENT_ID: z.string().optional(),
  REDDIT_CLIENT_SECRET: z.string().optional(),
  REDDIT_USER_AGENT: z.string().optional(),
  
  // OpenAI API Configuration
  OPENAI_API_KEY: z.string().optional(),
});

export type AppConfig = {
  nodeEnv: 'development' | 'test' | 'production';
  host: string;
  port: number;
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
  
  // Reddit API Configuration
  redditClientId?: string;
  redditClientSecret?: string;
  redditUserAgent?: string;
  
  // OpenAI API Configuration
  openaiApiKey?: string;
};

export function loadConfig(): AppConfig {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    // Aggregate errors for clear message
    const errorMessage = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${errorMessage}`);
  }

  return {
    nodeEnv: parsed.data.NODE_ENV,
    host: parsed.data.HOST,
    port: parsed.data.PORT,
    logLevel: parsed.data.LOG_LEVEL,
    
    // Reddit API Configuration
    redditClientId: parsed.data.REDDIT_CLIENT_ID,
    redditClientSecret: parsed.data.REDDIT_CLIENT_SECRET,
    redditUserAgent: parsed.data.REDDIT_USER_AGENT,
    
    // OpenAI API Configuration
    openaiApiKey: parsed.data.OPENAI_API_KEY,
  };
}


