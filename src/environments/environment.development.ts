export const environment = {
  production: false,
  useLocalSample: true,
  apiBase: 'http://localhost:3000',
  awsRegion: 'us-east-1',
  cognitoDomain: 'today-in-sports',
  // Flip when the Google identity provider is configured in Cognito —
  // see enable_google_idp in the infrastructure repo.
  googleSignIn: false,
  cognitoClientId: '6qi99cqe6opomuehd58adb8n40',
};
