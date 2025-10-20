import request from 'supertest'
import app from '../src/index'

// Setup test utilities
const { generateTestToken, createTestUser } = global as any

describe('Authentication Routes', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.user).toMatchObject({
        name: userData.name,
        email: userData.email,
      })
      expect(response.body.data.token).toBeDefined()
    })

    it('should return error for duplicate email', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      }

      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201)

      // Second registration with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('USER_EXISTS')
    })

    it('should return error for invalid email', async () => {
      const userData = {
        name: 'Test User',
        email: 'invalid-email',
        password: 'password123',
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400)

      expect(response.body.success).toBe(false)
    })

    it('should return error for short password', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: '123',
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400)

      expect(response.body.success).toBe(false)
    })

    it('should return error for missing fields', async () => {
      const userData = {
        name: 'Test User',
        // Missing email and password
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400)

      expect(response.body.success).toBe(false)
    })
  })

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      const userData = {
        name: 'Login Test User',
        email: 'login@example.com',
        password: 'password123',
      }

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201)
    })

    it('should login successfully with valid credentials', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'password123',
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.user).toMatchObject({
        name: 'Login Test User',
        email: loginData.email,
      })
      expect(response.body.data.token).toBeDefined()
    })

    it('should return error for invalid email', async () => {
      const loginData = {
        email: 'wrong@example.com',
        password: 'password123',
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('INVALID_CREDENTIALS')
    })

    it('should return error for invalid password', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'wrongpassword',
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('INVALID_CREDENTIALS')
    })

    it('should return error for missing credentials', async () => {
      const loginData = {
        // Missing password
        email: 'login@example.com',
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400)

      expect(response.body.success).toBe(false)
    })
  })

  describe('Authentication Middleware', () => {
    let authToken: string

    beforeEach(() => {
      authToken = generateTestToken()
    })

    it('should allow access with valid JWT token', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
    })

    it('should reject access without token', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .expect(401)

      expect(response.body.error).toContain('MISSING_TOKEN')
    })

    it('should reject access with invalid token', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)

      expect(response.body.error).toContain('INVALID_TOKEN')
    })

    it('should reject access with expired token', async () => {
      // Create expired token
      const jwt = require('jsonwebtoken')
      const expiredToken = jwt.sign(
        { userId: 'test-user-id' },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' } // Expired 1 second ago
      )

      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401)

      expect(response.body.error).toContain('TOKEN_EXPIRED')
    })
  })
})