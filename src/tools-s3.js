import {
  S3Client,
  ListBucketsCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { z } from 'zod';
import { getAwsConfig, textResult, errorResult } from './aws.js';

export function registerS3Tools(server) {
  const client = new S3Client(getAwsConfig());

  server.tool(
    's3_list_buckets',
    'List all S3 buckets in the account.',
    {},
    async () => {
      try {
        const res = await client.send(new ListBucketsCommand({}));
        const buckets = (res.Buckets || []).map(b => ({
          Name: b.Name,
          CreationDate: b.CreationDate,
        }));
        return textResult({ count: buckets.length, buckets });
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    's3_list_objects',
    'List objects in an S3 bucket, optionally filtered by prefix.',
    {
      bucket: z.string().describe('S3 bucket name'),
      prefix: z.string().optional().describe('Key prefix to filter by'),
      maxKeys: z.number().optional().describe('Max keys to return (default 100)'),
    },
    async ({ bucket, prefix, maxKeys }) => {
      try {
        const params = {
          Bucket: bucket,
          MaxKeys: maxKeys || 100,
        };
        if (prefix) params.Prefix = prefix;

        const res = await client.send(new ListObjectsV2Command(params));
        const objects = (res.Contents || []).map(o => ({
          Key: o.Key,
          Size: o.Size,
          LastModified: o.LastModified,
        }));
        return textResult({
          bucket,
          prefix: prefix || '',
          count: objects.length,
          truncated: res.IsTruncated || false,
          objects,
        });
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    's3_get_object',
    'Read the contents of a text object from S3. Returns the body as a string.',
    {
      bucket: z.string().describe('S3 bucket name'),
      key: z.string().describe('Object key'),
    },
    async ({ bucket, key }) => {
      try {
        const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        const body = await res.Body.transformToString();
        return textResult({
          bucket,
          key,
          contentType: res.ContentType,
          contentLength: res.ContentLength,
          lastModified: res.LastModified,
          body,
        });
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    's3_put_object',
    'Write text content to an S3 object.',
    {
      bucket: z.string().describe('S3 bucket name'),
      key: z.string().describe('Object key'),
      body: z.string().describe('Text content to write'),
      contentType: z.string().optional().describe('Content-Type (default text/plain)'),
    },
    async ({ bucket, key, body, contentType }) => {
      try {
        await client.send(new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType || 'text/plain',
        }));
        return textResult({ bucket, key, status: 'written', size: body.length });
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
