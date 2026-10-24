import { describe, expect, it } from 'vitest';
import { parseConfig } from './config';

describe('parseConfig', () => {
  it('defaults to mock with the dev proxy', () => expect(parseConfig({})).toEqual({ mode: 'mock', apiBase: '', error: null }));
  it('rejects unknown modes instead of guessing', () => expect(parseConfig({ VITE_DATA_MODE: 'prod' }).error).toMatch(/mock.*live/));
  it('allows https and localhost http only', () => {
    expect(parseConfig({ VITE_DATA_MODE: 'live', VITE_API_BASE_URL: 'https://api.example.com/' }).apiBase).toBe('https://api.example.com');
    expect(parseConfig({ VITE_API_BASE_URL: 'http://localhost:8000' }).error).toBeNull();
    expect(parseConfig({ VITE_API_BASE_URL: 'http://api.example.com' }).error).toMatch(/https/);
  });
  it('rejects embedded credentials, queries and non-URLs', () => {
    expect(parseConfig({ VITE_API_BASE_URL: 'https://u:p@api.example.com' }).error).toMatch(/credentials/);
    expect(parseConfig({ VITE_API_BASE_URL: 'https://api.example.com/?k=1' }).error).toMatch(/query/);
    expect(parseConfig({ VITE_API_BASE_URL: 'javascript:alert(1)' }).error).not.toBeNull();
  });
});
