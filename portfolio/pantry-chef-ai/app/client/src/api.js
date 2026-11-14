// Every conversation with the server goes through this file.
// The screens call api.something() and never use fetch() directly.

async function request(path, { method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch('/api' + path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the Potwise server. Check that it is running.');
  }
  if (response.status === 204) return null; // "done, nothing to send back"
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || `Something went wrong (${response.status}).`);
  return data;
}

export const api = {
  categories: () => request('/categories'),
  recipes: (params = {}) => {
    const query = new URLSearchParams();
    for (const [name, value] of Object.entries(params)) if (value) query.set(name, value);
    const text = query.toString();
    return request('/recipes' + (text ? '?' + text : ''));
  },
  recipe: (id) => request('/recipes/' + encodeURIComponent(id)),
  randomRecipe: () => request('/recipes/random'),

  pantry: () => request('/pantry'),
  addPantry: (name) => request('/pantry', { method: 'POST', body: { name } }),
  removePantry: (id) => request('/pantry/' + id, { method: 'DELETE' }),

  saved: () => request('/saved'),
  setSaved: (id, saved) => request('/saved/' + id, { method: saved ? 'PUT' : 'DELETE' }),

  suggest: (body) => request('/chef/suggest', { method: 'POST', body }),
  dietPlan: (goal) => request('/chef/diet-plan', { method: 'POST', body: { goal } }),
};
