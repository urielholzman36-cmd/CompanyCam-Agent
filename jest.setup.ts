// Global test setup
process.env.COMPANYCAM_API_KEY = 'test-companycam-key'
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
process.env.KREA_API_KEY = 'test-krea-key'
process.env.GOOGLE_DRIVE_CREDENTIALS = JSON.stringify({
  type: 'service_account',
  project_id: 'test',
  private_key_id: 'test',
  private_key: '-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----\n',
  client_email: 'test@test.iam.gserviceaccount.com',
  client_id: '123',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
})
process.env.GOOGLE_DRIVE_FOLDER_ID = 'test-folder-id'
