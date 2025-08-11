import { HealthCheck } from '../../components/health/HealthCheck';

export function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <section className="max-w-3xl mx-auto p-6">
        <h1 className="text-3xl font-bold">Ideafinder</h1>
        <p className="mt-2 text-gray-600">Welcome to Ideafinder frontend skeleton.</p>
        <HealthCheck />
      </section>
    </main>
  );
}

export default HomePage;


