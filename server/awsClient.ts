import { S3Client, S3ClientConfig } from '@aws-sdk/client-s3';
import { TextractClient, TextractClientConfig } from '@aws-sdk/client-textract';
import { BedrockRuntimeClient, BedrockRuntimeClientConfig } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBClient, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { SNSClient, SNSClientConfig } from '@aws-sdk/client-sns';

let s3ClientInstance: S3Client | null = null;
let textractClientInstance: TextractClient | null = null;
let bedrockClientInstance: BedrockRuntimeClient | null = null;
let dynamoDocClientInstance: DynamoDBDocumentClient | null = null;
let rawDynamoClientInstance: DynamoDBClient | null = null;
let snsClientInstance: SNSClient | null = null;

export interface AwsStatus {
  isConfigured: boolean;
  demoMode: boolean;
  mode: 'local' | 'aws';
  region: string;
  endpoints: {
    localstack: string;
    s3: string;
    dynamodb: string;
    sns: string;
  };
  s3Bucket: string;
  dynamoTable: string;
  bedrockModel: string;
  snsTopicConfigured: boolean;
  services: {
    s3: 'connected' | 'demo_fallback';
    textract: 'local' | 'aws';
    bedrock: 'fixture' | 'aws';
    dynamodb: 'connected' | 'demo_fallback';
    sns: 'connected' | 'demo_fallback';
  };
}

export function getAwsRegion(): string {
  return process.env.AWS_REGION || 'us-east-1';
}

export function getLocalStackEndpoint(): string {
  return process.env.LOCALSTACK_ENDPOINT || process.env.AWS_ENDPOINT_URL || 'http://localhost:4566';
}

export function isAwsCredentialsConfigured(): boolean {
  const key = process.env.AWS_ACCESS_KEY_ID;
  const secret = process.env.AWS_SECRET_ACCESS_KEY;
  // If test credentials or local mode, it's local
  if (!key || !secret) return false;
  if (key === 'test' || key === 'dummy' || key.toLowerCase().includes('mock')) {
    return false;
  }
  return true;
}

export function isLocalStackMode(): boolean {
  const storageMode = (process.env.STORAGE_MODE || 'localstack').toLowerCase();
  return storageMode === 'localstack' || !isAwsCredentialsConfigured();
}

export function isDemoMode(): boolean {
  if (process.env.DEMO_MODE === 'false' && isAwsCredentialsConfigured()) {
    return false;
  }
  return true;
}

/** BEDROCK_MODE=aws selects the Bedrock provider (which still needs real credentials to invoke). */
export function isBedrockMode(): boolean {
  return (process.env.BEDROCK_MODE || 'local').toLowerCase() === 'aws';
}

export function isTextractEnabled(): boolean {
  return (process.env.TEXTRACT_MODE || 'local').toLowerCase() === 'aws' && isAwsCredentialsConfigured();
}

export const DEFAULT_BEDROCK_MODEL_ID = 'anthropic.claude-3-5-sonnet-20241022-v2:0';
// Cross-region inference profile, for regions where the base model ID can't be invoked on demand
export const FALLBACK_BEDROCK_MODEL_ID = 'us.anthropic.claude-3-5-sonnet-20241022-v2:0';

/** Model IDs to try in order: BEDROCK_MODEL_ID (if set), then the default, then the inference profile. */
export function getBedrockModelIds(): string[] {
  const configured = process.env.BEDROCK_MODEL_ID?.trim();
  return Array.from(
    new Set([configured, DEFAULT_BEDROCK_MODEL_ID, FALLBACK_BEDROCK_MODEL_ID].filter((id): id is string => Boolean(id)))
  );
}

/**
 * Factory for AWS SDK v3 S3 Client
 * Can target LocalStack or real AWS S3 via options or environment variables.
 */
export function createS3Client(configOverrides: Partial<S3ClientConfig> = {}): S3Client {
  const region = getAwsRegion();
  const endpoint = process.env.S3_ENDPOINT || getLocalStackEndpoint();
  const isLocal = isLocalStackMode();

  const baseConfig: S3ClientConfig = {
    region,
    ...configOverrides,
  };

  if (isLocal) {
    baseConfig.endpoint = endpoint;
    baseConfig.forcePathStyle = true;
    baseConfig.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
    };
  } else if (isAwsCredentialsConfigured()) {
    baseConfig.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      sessionToken: process.env.AWS_SESSION_TOKEN || undefined,
    };
  }

  return new S3Client(baseConfig);
}

/**
 * Factory for AWS SDK v3 DynamoDB Client
 */
export function createDynamoClient(configOverrides: Partial<DynamoDBClientConfig> = {}): DynamoDBClient {
  const region = getAwsRegion();
  const endpoint = process.env.DYNAMODB_ENDPOINT || getLocalStackEndpoint();
  const isLocal = isLocalStackMode();

  const baseConfig: DynamoDBClientConfig = {
    region,
    ...configOverrides,
  };

  if (isLocal) {
    baseConfig.endpoint = endpoint;
    baseConfig.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
    };
  } else if (isAwsCredentialsConfigured()) {
    baseConfig.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      sessionToken: process.env.AWS_SESSION_TOKEN || undefined,
    };
  }

  return new DynamoDBClient(baseConfig);
}

/**
 * Factory for AWS SDK v3 SNS Client
 */
export function createSNSClient(configOverrides: Partial<SNSClientConfig> = {}): SNSClient {
  const region = getAwsRegion();
  const endpoint = process.env.SNS_ENDPOINT || getLocalStackEndpoint();
  const isLocal = isLocalStackMode();

  const baseConfig: SNSClientConfig = {
    region,
    ...configOverrides,
  };

  if (isLocal) {
    baseConfig.endpoint = endpoint;
    baseConfig.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
    };
  } else if (isAwsCredentialsConfigured()) {
    baseConfig.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      sessionToken: process.env.AWS_SESSION_TOKEN || undefined,
    };
  }

  return new SNSClient(baseConfig);
}

/**
 * Factory for Amazon Textract Client (for future live AWS deployment)
 */
export function createTextractClient(configOverrides: Partial<TextractClientConfig> = {}): TextractClient {
  const region = getAwsRegion();
  return new TextractClient({
    region,
    credentials: isAwsCredentialsConfigured()
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
          sessionToken: process.env.AWS_SESSION_TOKEN || undefined,
        }
      : undefined,
    ...configOverrides,
  });
}

/**
 * Factory for Amazon Bedrock Runtime Client (for future live AWS deployment)
 */
export function createBedrockClient(configOverrides: Partial<BedrockRuntimeClientConfig> = {}): BedrockRuntimeClient {
  const region = getAwsRegion();
  return new BedrockRuntimeClient({
    region,
    credentials: isAwsCredentialsConfigured()
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
          sessionToken: process.env.AWS_SESSION_TOKEN || undefined,
        }
      : undefined,
    ...configOverrides,
  });
}

// Singleton accessors with caching
export function getS3(): S3Client {
  if (!s3ClientInstance) {
    s3ClientInstance = createS3Client();
  }
  return s3ClientInstance;
}

export function getRawDynamoDB(): DynamoDBClient {
  if (!rawDynamoClientInstance) {
    rawDynamoClientInstance = createDynamoClient();
  }
  return rawDynamoClientInstance;
}

export function getDynamoDB(): DynamoDBDocumentClient {
  if (!dynamoDocClientInstance) {
    const rawClient = getRawDynamoDB();
    dynamoDocClientInstance = DynamoDBDocumentClient.from(rawClient, {
      marshallOptions: {
        removeUndefinedValues: true,
      },
    });
  }
  return dynamoDocClientInstance;
}

export function getSNS(): SNSClient {
  if (!snsClientInstance) {
    snsClientInstance = createSNSClient();
  }
  return snsClientInstance;
}

export function getTextract(): TextractClient {
  if (!textractClientInstance) {
    textractClientInstance = createTextractClient();
  }
  return textractClientInstance;
}

export function getBedrock(): BedrockRuntimeClient {
  if (!bedrockClientInstance) {
    bedrockClientInstance = createBedrockClient();
  }
  return bedrockClientInstance;
}

// Connectivity cache
let localStackConnectedCache: boolean | null = null;
let lastCheckTime = 0;

export async function checkLocalStackConnectivity(): Promise<boolean> {
  const now = Date.now();
  if (localStackConnectedCache !== null && now - lastCheckTime < 10000) {
    return localStackConnectedCache;
  }

  try {
    const endpoint = getLocalStackEndpoint();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);

    const res = await fetch(`${endpoint}/_localstack/health`, {
      signal: controller.signal,
    }).catch(() => null);

    clearTimeout(timeout);
    localStackConnectedCache = Boolean(res && res.ok);
    lastCheckTime = now;
    return localStackConnectedCache;
  } catch {
    localStackConnectedCache = false;
    lastCheckTime = now;
    return false;
  }
}

export function getAwsStatus(): AwsStatus {
  const isLiveAws = isAwsCredentialsConfigured();
  const endpoint = getLocalStackEndpoint();

  return {
    isConfigured: isLiveAws,
    demoMode: isDemoMode(),
    mode: isLiveAws ? 'aws' : 'local',
    region: getAwsRegion(),
    endpoints: {
      localstack: endpoint,
      s3: process.env.S3_ENDPOINT || endpoint,
      dynamodb: process.env.DYNAMODB_ENDPOINT || endpoint,
      sns: process.env.SNS_ENDPOINT || endpoint,
    },
    s3Bucket: process.env.S3_BUCKET_NAME || 'carepath-documents',
    dynamoTable: process.env.DYNAMODB_TABLE_NAME || 'carepath-documents',
    bedrockModel: getBedrockModelIds()[0],
    snsTopicConfigured: Boolean(process.env.SNS_TOPIC_ARN),
    services: {
      s3: localStackConnectedCache ? 'connected' : 'demo_fallback',
      textract: isTextractEnabled() ? 'aws' : 'local',
      bedrock: isBedrockMode() && isLiveAws ? 'aws' : 'fixture',
      dynamodb: localStackConnectedCache ? 'connected' : 'demo_fallback',
      sns: localStackConnectedCache ? 'connected' : 'demo_fallback',
    },
  };
}
