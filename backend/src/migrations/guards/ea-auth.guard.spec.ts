import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { EAAuthGuard } from './ea-auth.guard';

describe('EAAuthGuard', () => {
  let guard: EAAuthGuard;
  const testSecret = 'dataforge-agent-secret-key';

  beforeEach(() => {
    process.env.DEFAULT_JWT_SECRET = testSecret;
    guard = new EAAuthGuard();
  });

  const createMockContext = (
    headers: Record<string, string> = {},
  ): { context: ExecutionContext; request: any } => {
    const request = {
      headers,
    };

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    return { context, request };
  };

  it('should throw UnauthorizedException if no token is provided', async () => {
    const { context } = createMockContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Authorization token is required'),
    );
  });

  it('should throw UnauthorizedException if authorization header is not Bearer', async () => {
    const { context } = createMockContext({
      authorization: 'Basic dXNlcjpwYXNz',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Authorization token is required'),
    );
  });

  it('should throw UnauthorizedException if token is invalid or malformed', async () => {
    const { context } = createMockContext({
      authorization: 'Bearer invalid.token.payload',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Invalid authorization token'),
    );
  });

  it('should throw UnauthorizedException if token is expired', async () => {
    const expiredToken = jwt.sign(
      { agent_id: 'agent-123', organization_id: 'org-456' },
      testSecret,
      { expiresIn: -10 },
    );

    const { context } = createMockContext({
      authorization: `Bearer ${expiredToken}`,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Authorization token has expired'),
    );
  });

  it('should throw UnauthorizedException if token payload is missing agent_id', async () => {
    const tokenWithoutAgentId = jwt.sign(
      { organization_id: 'org-456' },
      testSecret,
    );

    const { context } = createMockContext({
      authorization: `Bearer ${tokenWithoutAgentId}`,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException(
        'Invalid authorization token: missing agent identity',
      ),
    );
  });

  it('should allow access and attach agent payload to request on valid Bearer token', async () => {
    const validToken = jwt.sign(
      { agent_id: 'agent-ea-001', organization_id: 'org-ea-001' },
      testSecret,
      { expiresIn: '1h' },
    );

    const { context, request } = createMockContext({
      authorization: `Bearer ${validToken}`,
    });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.agent).toBeDefined();
    expect(request.agent.agent_id).toBe('agent-ea-001');
    expect(request.agent.organization_id).toBe('org-ea-001');
    expect(request.agentId).toBe('agent-ea-001');
    expect(request.organizationId).toBe('org-ea-001');
  });

  it('should allow access using fallback header x-agent-token', async () => {
    const validToken = jwt.sign(
      { agent_id: 'agent-header-test', organization_id: 'org-header-test' },
      testSecret,
      { expiresIn: '1h' },
    );

    const { context, request } = createMockContext({
      'x-agent-token': validToken,
    });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.agent.agent_id).toBe('agent-header-test');
  });
});
