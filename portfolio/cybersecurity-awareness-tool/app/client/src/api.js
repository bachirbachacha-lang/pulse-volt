// Every conversation with the server goes through this file.
// The screens call api.something() and never use fetch() directly.
// Note what is NOT here: nothing sends a password. The checker never uses this file.

async function request(path, { method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch('/api' + path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the Latchlight server. Check that it is running.');
  }
  if (response.status === 204) return null; // "done, nothing to send back"
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || `Something went wrong (${response.status}).`);
  return data;
}

export const api = {
  dashboard: () => request('/dashboard'),
  topics: () => request('/topics'),
  lessons: () => request('/lessons'),
  lesson: (id) => request('/lessons/' + encodeURIComponent(id)),
  setLessonDone: (id, done) => request(`/lessons/${id}/done`, { method: done ? 'PUT' : 'DELETE' }),

  quiz: (topic) => request('/quizzes/' + encodeURIComponent(topic)),
  submitQuiz: (topic, answers) => request(`/quizzes/${encodeURIComponent(topic)}/attempts`, { method: 'POST', body: { answers } }),

  messages: () => request('/phish/messages'),
  answerMessage: (id, verdict) => request(`/phish/messages/${id}/answer`, { method: 'POST', body: { verdict } }),

  resetProgress: () => request('/progress', { method: 'DELETE' }),
};
