export const API_BASE_URL = 'http://localhost:3000/api';

export const getDoctorId = (): string => {
  const storedId = localStorage.getItem('doctorId') || 
                   localStorage.getItem('userId') ||
                   localStorage.getItem('user_id') ||
                   localStorage.getItem('id');

  if (!storedId || storedId === 'undefined' || storedId === 'null') {
    console.error('❌ Doctor ID not found in localStorage');
    return '';
  }
  
  return storedId;
};

export const getAvatarUrl = (avatarPath: string | undefined): string => {
  if (!avatarPath) return '';
  
  if (avatarPath.startsWith('http')) {
    return avatarPath;
  }
  
  if (avatarPath.startsWith('doctor-')) {
    return `${API_BASE_URL}/doctors/avatar/${avatarPath}?t=${Date.now()}`;
  }
  
  return '';
};

export const shouldShowAvatar = (avatarPath: string | undefined): boolean => {
  if (!avatarPath) return false;
  return avatarPath.startsWith('doctor-');
};