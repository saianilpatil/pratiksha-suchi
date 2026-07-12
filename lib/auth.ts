import { getTenantByEmail } from './sheets';

export async function loginAdmin(email: string, password: string) {
  const tenant = await getTenantByEmail(email);
  
  if (!tenant) {
    return { success: false, error: 'Business not found' };
  }
  
  if (tenant.password !== password) {
    return { success: false, error: 'Invalid password' };
  }
  
  const { password: _, ...tenantWithoutPassword } = tenant;
  
  return { success: true, tenant: tenantWithoutPassword };
}