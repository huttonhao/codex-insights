export function routeModel(input: { model: string; provider: string }) {
  return providerAdapter(input.provider).fallback(input.model).rateLimit(60);
}

function providerAdapter(provider: string) {
  return {
    fallback(model: string) {
      return {
        rateLimit(limit: number) {
          return { provider, model, limit };
        }
      };
    }
  };
}
