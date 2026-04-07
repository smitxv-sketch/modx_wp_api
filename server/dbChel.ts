import mysql from 'mysql2/promise';

// Пул соединений для базы данных Челябинска (WordPress)
export const dbChel = mysql.createPool({
  host: 'cisto.beget.tech',
  user: 'cisto_ci74',
  password: 'c9%CFZlVKaW&',
  database: 'cisto_ci74',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
