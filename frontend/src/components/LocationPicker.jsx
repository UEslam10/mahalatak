import { useEffect, useState } from 'react';
import { api } from '../api';
import { useLocationCtx } from '../context/LocationContext';

export default function LocationPicker() {
  const { pickerOpen, closePicker, setLocation, city: currentCity } = useLocationCtx();
  const [locations, setLocations] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedVillage, setSelectedVillage] = useState('');

  useEffect(() => {
    api.getLocations().then(({ locations: apiLocs }) => {
      setLocations(apiLocs || []);
    }).catch(() => {});
  }, []);

  if (!pickerOpen) return null;

  const villagesForCity = locations.find((l) => l.city === selectedCity)?.villages || [];

  function confirm() {
    if (!selectedCity) return;
    setLocation(selectedCity, selectedVillage);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        <h2 className="text-lg font-extrabold mb-1">فين مكانك؟ 📍</h2>
        <p className="text-sm text-gray-500 mb-4">اختر مدينتك وقريتك عشان نوريك المحلات القريبة منك</p>

        <label className="block text-sm font-semibold mb-1">المدينة / المركز</label>
        <select
          value={selectedCity}
          onChange={(e) => { setSelectedCity(e.target.value); setSelectedVillage(''); }}
          className="w-full border border-gray-300 rounded-xl px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">-- اختر المدينة --</option>
          {locations.map((l) => (
            <option key={l.city} value={l.city}>{l.city}</option>
          ))}
        </select>

        {villagesForCity.length > 0 && (
          <>
            <label className="block text-sm font-semibold mb-1">القرية / الحي</label>
            <select
              value={selectedVillage}
              onChange={(e) => setSelectedVillage(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">-- كل المنطقة --</option>
              {villagesForCity.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </>
        )}

        <div className="flex gap-2 mt-2">
          {currentCity && (
            <button
              onClick={closePicker}
              className="flex-1 border border-gray-300 rounded-xl py-2.5 font-semibold text-gray-600"
            >
              إلغاء
            </button>
          )}
          <button
            onClick={confirm}
            disabled={!selectedCity}
            className="flex-1 bg-primary-600 disabled:opacity-40 hover:bg-primary-700 text-white rounded-xl py-2.5 font-semibold"
          >
            تأكيد
          </button>
        </div>
      </div>
    </div>
  );
}
