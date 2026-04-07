import { dbChel } from '../dbChel';
import { Doctor } from '../../src/types';

export async function getChelDoctors(): Promise<Doctor[]> {
  try {
    const [rows] = await dbChel.query('SELECT * FROM wp_doctors_api_cache');
    const doctors = rows as any[];

    return doctors.map(doc => {
      // Парсинг JSON-полей, если они есть
      let education_history = [];
      let badges = [];
      let raw_meta = {};

      try { if (doc.education_history) education_history = JSON.parse(doc.education_history); } catch (e) {}
      try { if (doc.badges) badges = JSON.parse(doc.badges); } catch (e) {}
      try { if (doc.raw_meta) raw_meta = JSON.parse(doc.raw_meta); } catch (e) {}

      // Склеиваем rank из доступных полей, как просили
      const rankParts = [doc.position, doc.zvanie, doc.degree, doc.category].filter(Boolean);
      const rank = rankParts.join(', ');

      return {
        id: doc.wp_user_id || doc.id,
        city: 'chel',
        qms_id: doc.qms_id,
        pagetitle: doc.display_name || 'Без имени',
        alias: `doctor-${doc.wp_user_id || doc.id}`, // В WP может не быть alias, генерируем
        photo: doc.photo_url || '',
        specialization: doc.specialty || '',
        rank: rank,
        experience: doc.experience_years || 0,
        education: doc.education_text || '',
        description: doc.description || '',
        anonce: doc.anonce || '',
        activities: doc.activities || '',
        education_history: education_history,
        badges: badges,
        price: doc.price || 0,
        duration: doc.duration || 0,
        is_child_doctor: doc.is_child_doctor === 1,
        is_adult_doctor: doc.is_adult_doctor === 1,
        raw_data: raw_meta
      };
    });
  } catch (error) {
    console.error('Error fetching Chelyabinsk doctors:', error);
    return [];
  }
}
