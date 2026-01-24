// Redirect to login page
export const redirectToLoginPage = () => {
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
};
// Real API Base URL
export const API_BASE_URL = 'http://localhost:3000/api';
export const SOCKET_URL = 'http://localhost:3000';

export const getDoctorId = (): string => {
  const storedId = localStorage.getItem('doctorId') || 
                  localStorage.getItem('userId') ||
                  localStorage.getItem('user_id') ||
                  localStorage.getItem('id');

  if (!storedId || storedId === 'undefined' || storedId === 'null') {
    console.error('❌ Doctor ID not found in localStorage');
    redirectToLoginPage();
    return '';
  }
  
  return storedId;
};

export const getAuthToken = (): string => {
  const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
  return token || '';
};

export const getAvatarUrl = (avatarPath: string | undefined): string => {
  if (!avatarPath) {
    return 'https://lh3.googleusercontent.com/aida-public/AB6AXuDzGT7gwberGMMlbYPnkoMNOA8qmXTkhXqIBCKvsZx0EM1ksC8Jfgtoaoh8vdBlr9W0ngsc2pkf87T1WhJty8dqmuTRfm2G3_Hzd_T_G_4vlHyxaSkvlmRUYkkpZIwJO9p4eo4FkzbHvN2AdbbHwvHHyxMmCV4gMu4567PLZLQhSsGIXC190ExsQ7dQbejyuRsszhD3Y__YDWJLZKc1BwjeUNmIXRzT1W5ZAZYslyj5WslFz0z6xRdxNl-vKYqdOkctzhJ5P1YrUwG9';
  }
  
  console.log('🔍 getAvatarUrl input:', avatarPath);
  
  if (avatarPath.startsWith('http')) {
    return avatarPath;
  }
    let filename = avatarPath;
  if (avatarPath.includes('/')) {
    filename = avatarPath.split('/').pop() || avatarPath;
    console.log('📦 Extracted filename:', filename);
  }
    const baseUrl = API_BASE_URL.replace('/api', '');
  return `${baseUrl}/uploads/avatars/${filename}`;
};

export const getInitials = (name?: string): string => {
  if (!name) return '?';
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
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

export const formatDateTime = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
};

export const formatTime = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
};

// Push Notification Types
export type DeviceType = 'android' | 'ios' | 'web' | 'desktop';

export interface PushNotificationPayload {
  device_token: string;
  device_type: DeviceType;
  title: string;
  body: string;
  data?: Record<string, any>;
}

// Push Notification Service
export class PushNotificationService {
  // Firebase Admin SDK instance
  private firebaseAdmin: any;

  constructor(firebaseAdminInstance: any) {
    this.firebaseAdmin = firebaseAdminInstance;
  }

  // Send single notification
  async send(payload: PushNotificationPayload): Promise<boolean> {
    try {
      switch (payload.device_type) {
        case 'android':
        case 'ios':
          return await this.firebaseAdmin.messaging().send({
            token: payload.device_token,
            notification: {
              title: payload.title,
              body: payload.body
            },
            data: payload.data || {}
          });
        case 'web':
          return await this.sendWebPush(payload);
        case 'desktop':
          console.error('❌ Desktop push notifications not supported yet');
          return false;
        default:
          console.error(`❌ Unsupported device type: ${payload.device_type}`);
          return false;
      }
    } catch (error) {
      console.error('❌ Error sending push notification:', error);
      return false;
    }
  }

  // Send Web Push Notification
  private async sendWebPush(payload: PushNotificationPayload): Promise<boolean> {
    try {
      // Implement web push logic here (e.g., using web-push library)
      console.log('📧 Sending web push notification:', payload);
      return true;
    } catch (error) {
      console.error('❌ Error sending web push notification:', error);
      return false;
    }
  }
} 

export const getTimeFromDateTime = (dateTimeString: string): string => {
  try {
    const date = new Date(dateTimeString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return dateTimeString;
  }
};

export const getDateFromDateTime = (dateTimeString: string): string => {
  try {
    const date = new Date(dateTimeString);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return dateTimeString;
  }
};


