import { loadConfig } from '../src/lib/config';
import { buildApp } from '../src/server/app';

describe('ideas module', () => {
  it('lists and creates ideas', async () => {
    const config = loadConfig();
    const app = await buildApp({ ...config, port: 0 });

    // list empty
    const listEmpty = await app.inject({ method: 'GET', url: '/idea/api/v1' });
    expect(listEmpty.statusCode).toBe(200);
    expect(listEmpty.json()).toEqual({ items: [] });

    // create
    const create = await app.inject({
      method: 'POST',
      url: '/idea/api/v1',
      payload: { title: 'New Idea', description: 'A pretty cool idea for testing' },
    });
    expect(create.statusCode).toBe(201);
    const created = create.json();
    expect(created).toHaveProperty('id');

    // list with one
    const listOne = await app.inject({ method: 'GET', url: '/idea/api/v1' });
    expect(listOne.statusCode).toBe(200);
    const body = listOne.json();
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.length).toBe(1);

    await app.close();
  });
});


