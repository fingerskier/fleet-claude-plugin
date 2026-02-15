/**
 * AWS configuration and service enablement helpers.
 */

const ALL_SERVICES = ['sts', 'ec2', 's3', 'cloudwatch', 'lambda', 'ecs', 'cloudformation'];

export function getAwsConfig() {
  return {
    region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
  };
}

export function getEnabledServices() {
  const env = process.env.FLEET_SERVICES;
  if (!env) return ALL_SERVICES;
  return env
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(s => ALL_SERVICES.includes(s));
}

export function formatError(err) {
  const name = err.name || err.constructor?.name || 'Error';
  const message = err.message || String(err);
  if (name === 'CredentialsProviderError' || message.includes('Could not load credentials')) {
    return 'AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY, or configure an AWS profile.';
  }
  if (name === 'ExpiredTokenException' || message.includes('expired')) {
    return 'AWS credentials have expired. Refresh your session token or re-authenticate.';
  }
  return `${name}: ${message}`;
}

export function textResult(data) {
  return {
    content: [{
      type: 'text',
      text: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
    }],
  };
}

export function errorResult(err) {
  return {
    content: [{
      type: 'text',
      text: formatError(err),
    }],
    isError: true,
  };
}
