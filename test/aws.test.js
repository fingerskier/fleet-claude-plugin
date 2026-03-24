import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getAwsConfig, getEnabledServices, formatError, textResult, errorResult } from '../src/aws.js';

describe('getAwsConfig', () => {
  it('returns default region when no env vars set', () => {
    const origRegion = process.env.AWS_REGION;
    const origDefault = process.env.AWS_DEFAULT_REGION;
    delete process.env.AWS_REGION;
    delete process.env.AWS_DEFAULT_REGION;
    try {
      const config = getAwsConfig();
      assert.equal(config.region, 'us-east-1');
    } finally {
      if (origRegion !== undefined) process.env.AWS_REGION = origRegion;
      if (origDefault !== undefined) process.env.AWS_DEFAULT_REGION = origDefault;
    }
  });

  it('prefers AWS_REGION over AWS_DEFAULT_REGION', () => {
    const origRegion = process.env.AWS_REGION;
    const origDefault = process.env.AWS_DEFAULT_REGION;
    process.env.AWS_REGION = 'eu-west-1';
    process.env.AWS_DEFAULT_REGION = 'ap-south-1';
    try {
      assert.equal(getAwsConfig().region, 'eu-west-1');
    } finally {
      if (origRegion !== undefined) process.env.AWS_REGION = origRegion;
      else delete process.env.AWS_REGION;
      if (origDefault !== undefined) process.env.AWS_DEFAULT_REGION = origDefault;
      else delete process.env.AWS_DEFAULT_REGION;
    }
  });

  it('falls back to AWS_DEFAULT_REGION', () => {
    const origRegion = process.env.AWS_REGION;
    const origDefault = process.env.AWS_DEFAULT_REGION;
    delete process.env.AWS_REGION;
    process.env.AWS_DEFAULT_REGION = 'ap-south-1';
    try {
      assert.equal(getAwsConfig().region, 'ap-south-1');
    } finally {
      if (origRegion !== undefined) process.env.AWS_REGION = origRegion;
      if (origDefault !== undefined) process.env.AWS_DEFAULT_REGION = origDefault;
      else delete process.env.AWS_DEFAULT_REGION;
    }
  });
});

describe('getEnabledServices', () => {
  it('returns all services when FLEET_SERVICES is not set', () => {
    const orig = process.env.FLEET_SERVICES;
    delete process.env.FLEET_SERVICES;
    try {
      const services = getEnabledServices();
      assert.deepEqual(services, ['sts', 'ec2', 's3', 'cloudwatch', 'lambda', 'ecs', 'cloudformation']);
    } finally {
      if (orig !== undefined) process.env.FLEET_SERVICES = orig;
    }
  });

  it('parses comma-separated services', () => {
    const orig = process.env.FLEET_SERVICES;
    process.env.FLEET_SERVICES = 'ec2, s3, lambda';
    try {
      const services = getEnabledServices();
      assert.deepEqual(services, ['ec2', 's3', 'lambda']);
    } finally {
      if (orig !== undefined) process.env.FLEET_SERVICES = orig;
      else delete process.env.FLEET_SERVICES;
    }
  });

  it('filters out invalid service names', () => {
    const orig = process.env.FLEET_SERVICES;
    process.env.FLEET_SERVICES = 'ec2,fake,s3';
    try {
      const services = getEnabledServices();
      assert.deepEqual(services, ['ec2', 's3']);
    } finally {
      if (orig !== undefined) process.env.FLEET_SERVICES = orig;
      else delete process.env.FLEET_SERVICES;
    }
  });

  it('handles case insensitivity', () => {
    const orig = process.env.FLEET_SERVICES;
    process.env.FLEET_SERVICES = 'EC2,Lambda';
    try {
      const services = getEnabledServices();
      assert.deepEqual(services, ['ec2', 'lambda']);
    } finally {
      if (orig !== undefined) process.env.FLEET_SERVICES = orig;
      else delete process.env.FLEET_SERVICES;
    }
  });
});

describe('formatError', () => {
  it('formats credentials error with helpful message', () => {
    const err = new Error('Could not load credentials from any providers');
    err.name = 'CredentialsProviderError';
    const msg = formatError(err);
    assert.ok(msg.includes('AWS credentials not configured'));
  });

  it('formats expired token error', () => {
    const err = new Error('Token has expired');
    err.name = 'ExpiredTokenException';
    const msg = formatError(err);
    assert.ok(msg.includes('expired'));
  });

  it('detects expired token by message content', () => {
    const err = new Error('The security token included in the request is expired');
    const msg = formatError(err);
    assert.ok(msg.includes('expired'));
  });

  it('formats generic errors with name and message', () => {
    const err = new Error('Something went wrong');
    err.name = 'ServiceException';
    const msg = formatError(err);
    assert.equal(msg, 'ServiceException: Something went wrong');
  });
});

describe('textResult', () => {
  it('wraps string data', () => {
    const result = textResult('hello');
    assert.deepEqual(result, {
      content: [{ type: 'text', text: 'hello' }],
    });
  });

  it('JSON-stringifies object data', () => {
    const result = textResult({ key: 'value' });
    assert.equal(result.content[0].type, 'text');
    assert.deepEqual(JSON.parse(result.content[0].text), { key: 'value' });
  });

  it('does not set isError', () => {
    const result = textResult('ok');
    assert.equal(result.isError, undefined);
  });
});

describe('errorResult', () => {
  it('sets isError flag', () => {
    const result = errorResult(new Error('fail'));
    assert.equal(result.isError, true);
  });

  it('uses formatError for the text', () => {
    const err = new Error('Could not load credentials');
    const result = errorResult(err);
    assert.ok(result.content[0].text.includes('AWS credentials not configured'));
  });
});
