import { GoogleProvider, MicrosoftProvider } from '@ethos/auth';
import { Logger } from '@nestjs/common';

import { EnvService } from '../../config/env.module';

import type { OAuthRegistry } from './oauth.tokens';

/**
 * Factory que inspeciona o `EnvService` e instancia providers que tenham
 * todas as envs presentes (D8.5.4). Chamado uma vez no boot do AuthModule.
 *
 * Convenção: providers omitidos quando faltar qualquer uma das 3 envs
 * (`CLIENT_ID` + `CLIENT_SECRET` + `REDIRECT_URI`). Loga `[OAuth] {provider}:
 * skipped (missing env)` no boot pra dar visibilidade ao dev.
 */
export function createOAuthRegistry(env: EnvService): OAuthRegistry {
  const logger = new Logger('OAuthRegistry');
  const registry: OAuthRegistry = new Map();

  const googleClientId = env.get('GOOGLE_CLIENT_ID');
  const googleClientSecret = env.get('GOOGLE_CLIENT_SECRET');
  const googleRedirectUri = env.get('GOOGLE_REDIRECT_URI');
  if (googleClientId && googleClientSecret && googleRedirectUri) {
    registry.set(
      'google',
      new GoogleProvider({
        clientId: googleClientId,
        clientSecret: googleClientSecret,
        redirectUri: googleRedirectUri,
      }),
    );
    logger.log('[OAuth] google: registered');
  } else {
    logger.log('[OAuth] google: skipped (missing env)');
  }

  const microsoftClientId = env.get('MICROSOFT_CLIENT_ID');
  const microsoftClientSecret = env.get('MICROSOFT_CLIENT_SECRET');
  const microsoftRedirectUri = env.get('MICROSOFT_REDIRECT_URI');
  if (microsoftClientId && microsoftClientSecret && microsoftRedirectUri) {
    registry.set(
      'microsoft',
      new MicrosoftProvider({
        clientId: microsoftClientId,
        clientSecret: microsoftClientSecret,
        redirectUri: microsoftRedirectUri,
      }),
    );
    logger.log('[OAuth] microsoft: registered');
  } else {
    logger.log('[OAuth] microsoft: skipped (missing env)');
  }

  return registry;
}
