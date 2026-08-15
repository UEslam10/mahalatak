import { createContext, useContext, useEffect, useState } from 'react';

const LocationContext = createContext(null);

export function LocationProvider({ children }) {
  const [city, setCity] = useState('');
  const [village, setVillage] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('mahalak_location');
    if (saved) {
      try {
        const { city, village } = JSON.parse(saved);
        setCity(city || '');
        setVillage(village || '');
      } catch {}
    } else {
      setPickerOpen(true);
    }
  }, []);

  function setLocation(city, village) {
    setCity(city);
    setVillage(village || '');
    localStorage.setItem('mahalak_location', JSON.stringify({ city, village }));
    setPickerOpen(false);
  }

  return (
    <LocationContext.Provider
      value={{ city, village, setLocation, pickerOpen, openPicker: () => setPickerOpen(true), closePicker: () => setPickerOpen(false) }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocationCtx() {
  return useContext(LocationContext);
}
