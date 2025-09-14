import { Client } from '@elastic/elasticsearch';

const client = new Client({
  node: 'http://localhost:9200',
  // You can also add auth or SSL settings here if needed
});

const elasticServiceConnection = async () => {
  try {
    const res = await client.info();
    console.log('Elasticsearch is running');
    return { message: 'Elasticsearch is running', client, status: 200 };
  } catch (e) {
    console.error(' Elasticsearch connection failed:', e);
    return { message: 'Elasticsearch is not running', client, status: 500 };
  }
};

export { client, elasticServiceConnection };
