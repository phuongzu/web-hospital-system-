export const calculateAge = (dateOfBirth: string): string => {
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

export const formatTime = (dateString: string, timeSlot: string): string => {
  try {
    const date = new Date(dateString);
    return `${date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })} • ${timeSlot}`;
  } catch {
    return `${dateString} • ${timeSlot}`;
  }
};

export const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 18) return 'Afternoon';
  return 'Evening';
};