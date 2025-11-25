// Real API Base URL
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

export const getAuthToken = (): string => {
  const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
  return token || '';
};

export const getAvatarUrl = (avatarPath: string | undefined): string => {
  if (!avatarPath) return '';
  
  if (avatarPath.startsWith('http')) {
    return avatarPath;
  }
  
  // Assuming backend serves static files at /uploads or similar, or specific endpoint
  if (avatarPath.startsWith('doctor-')) {
    return `${API_BASE_URL}/doctors/avatar/${avatarPath}`;
  }
  
  // Fallback
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(avatarPath)}&background=07b9d5&color=fff`;
};

export const calculateAge = (dateOfBirth: string | undefined): string => {
  if (!dateOfBirth) return '';
  try {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age.toString();
  } catch {
    return '';
  }
};

export const formatDate = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
};