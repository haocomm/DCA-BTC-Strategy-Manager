import { toast } from 'react-hot-toast'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003'

class ApiClient {
  private baseURL: string
  private defaultHeaders: Record<string, string>

  constructor(baseURL: string) {
    this.baseURL = baseURL
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    const url = `${this.baseURL}/api${endpoint}`

    // Get token from localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

    const headers = {
      ...this.defaultHeaders,
      ...options.headers,
      ...(token && { Authorization: `Bearer ${token}` }),
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`)
      }

      return data
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  async get<T>(endpoint: string): Promise<{ success: boolean; data?: T; error?: string }> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(
    endpoint: string,
    data?: any
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(
    endpoint: string,
    data?: any
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async patch<T>(
    endpoint: string,
    data?: any
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<{ success: boolean; data?: T; error?: string }> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

export const apiClient = new ApiClient(API_URL)

export const api = {
  get: async <T>(endpoint: string) => {
    try {
      const result = await apiClient.get<T>(endpoint)
      if (!result.success) {
        toast.error(result.error || 'Request failed')
      }
      return result
    } catch (error) {
      toast.error('Network error occurred')
      throw error
    }
  },

  post: async <T>(endpoint: string, data?: any) => {
    try {
      const result = await apiClient.post<T>(endpoint, data)
      if (!result.success) {
        toast.error(result.error || 'Request failed')
      }
      return result
    } catch (error) {
      toast.error('Network error occurred')
      throw error
    }
  },

  put: async <T>(endpoint: string, data?: any) => {
    try {
      const result = await apiClient.put<T>(endpoint, data)
      if (!result.success) {
        toast.error(result.error || 'Request failed')
      }
      return result
    } catch (error) {
      toast.error('Network error occurred')
      throw error
    }
  },

  patch: async <T>(endpoint: string, data?: any) => {
    try {
      const result = await apiClient.patch<T>(endpoint, data)
      if (!result.success) {
        toast.error(result.error || 'Request failed')
      }
      return result
    } catch (error) {
      toast.error('Network error occurred')
      throw error
    }
  },

  delete: async <T>(endpoint: string) => {
    try {
      const result = await apiClient.delete<T>(endpoint)
      if (!result.success) {
        toast.error(result.error || 'Request failed')
      }
      return result
    } catch (error) {
      toast.error('Network error occurred')
      throw error
    }
  },
}