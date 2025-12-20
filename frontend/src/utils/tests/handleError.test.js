import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleError } from '../handleError';

/**
 * UNIT TEST: handleError Utility Function
 * 
 * Testing Design Techniques Applied:
 * 1. Happy Path Testing - Standard error handling
 * 2. Decision Table Testing - Different error structures
 * 3. Error Guessing - Edge cases and malformed errors
 * 4. Equivalence Partitioning - Error response types
 */

describe('handleError Utility - Unit Tests', () => {
  // Suppress console.error during tests
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  // Happy Path Testing
  describe('Happy Path - Standard Error Responses', () => {
    it('should extract and throw message from nested error.details.message (string)', () => {
      const error = {
        response: {
          data: {
            error: {
              details: {
                message: 'Validation failed for field',
              },
            },
          },
        },
      };

      expect(() => handleError(error)).toThrow('Validation failed for field');
      expect(console.error).toHaveBeenCalledWith('API Error:', error.response.data);
    });

    it('should extract and throw direct message from data.message', () => {
      const error = {
        response: {
          data: {
            message: 'Resource not found',
          },
        },
      };

      expect(() => handleError(error)).toThrow('Resource not found');
      expect(console.error).toHaveBeenCalledWith('API Error:', error.response.data);
    });

    it('should join array of messages with comma', () => {
      const error = {
        response: {
          data: {
            error: {
              details: {
                message: ['Name is required', 'Email is invalid', 'Age must be positive'],
              },
            },
          },
        },
      };

      expect(() => handleError(error)).toThrow('Name is required, Email is invalid, Age must be positive');
    });

    it('should throw default message when no message found', () => {
      const error = {
        response: {
          data: {},
        },
      };

      expect(() => handleError(error)).toThrow('Something went wrong');
    });
  });

  // Decision Table Testing - Message Priority
  describe('Decision Table - Error Message Priority', () => {
    it('should prioritize error.details.message over data.message', () => {
      const error = {
        response: {
          data: {
            error: {
              details: {
                message: 'Detailed validation error',
              },
            },
            message: 'Generic error message',
          },
        },
      };

      expect(() => handleError(error)).toThrow('Detailed validation error');
    });

    it('should use data.message when error.details.message is not present', () => {
      const error = {
        response: {
          data: {
            error: {
              details: {},
            },
            message: 'Generic error message',
          },
        },
      };

      expect(() => handleError(error)).toThrow('Generic error message');
    });

    it('should use data.message when error.details is not present', () => {
      const error = {
        response: {
          data: {
            error: {},
            message: 'Simple error',
          },
        },
      };

      expect(() => handleError(error)).toThrow('Simple error');
    });

    it('should use default message when no structured message exists', () => {
      const error = {
        response: {
          data: {
            error: {},
          },
        },
      };

      expect(() => handleError(error)).toThrow('Something went wrong');
    });
  });

  // Boundary Value Analysis
  describe('BVA - Edge Cases', () => {
    it('should handle error with no response property', () => {
      const error = {
        message: 'Network Error',
      };

      expect(() => handleError(error)).toThrow('Something went wrong');
    });

    it('should handle error with null response', () => {
      const error = {
        response: null,
      };

      expect(() => handleError(error)).toThrow('Something went wrong');
    });

    it('should handle error with undefined response.data', () => {
      const error = {
        response: {
          data: undefined,
        },
      };

      expect(() => handleError(error)).toThrow('Something went wrong');
    });

    it('should handle empty array of messages', () => {
      const error = {
        response: {
          data: {
            error: {
              details: {
                message: [],
              },
            },
          },
        },
      };

      expect(() => handleError(error)).toThrow(''); // Empty string from [].join(',')
    });

    it('should handle single-item array message', () => {
      const error = {
        response: {
          data: {
            error: {
              details: {
                message: ['Single validation error'],
              },
            },
          },
        },
      };

      expect(() => handleError(error)).toThrow('Single validation error');
    });

    it('should handle empty string message', () => {
      const error = {
        response: {
          data: {
            message: '',
          },
        },
      };

      expect(() => handleError(error)).toThrow('Something went wrong');
    });

    it('should handle whitespace-only message', () => {
      const error = {
        response: {
          data: {
            message: '   ',
          },
        },
      };

      expect(() => handleError(error)).toThrow('   ');
    });
  });

  // Error Guessing - Malformed Responses
  describe('Error Guessing - Malformed Error Structures', () => {
    it('should handle null error.details', () => {
      const error = {
        response: {
          data: {
            error: {
              details: null,
            },
            message: 'Fallback message',
          },
        },
      };

      expect(() => handleError(error)).toThrow('Fallback message');
    });

    it('should handle undefined error.details.message', () => {
      const error = {
        response: {
          data: {
            error: {
              details: {
                message: undefined,
              },
            },
            message: 'Fallback message',
          },
        },
      };

      expect(() => handleError(error)).toThrow('Fallback message');
    });

    it('should handle null message', () => {
      const error = {
        response: {
          data: {
            message: null,
          },
        },
      };

      expect(() => handleError(error)).toThrow('Something went wrong');
    });

    it('should handle number as message', () => {
      const error = {
        response: {
          data: {
            error: {
              details: {
                message: 404,
              },
            },
          },
        },
      };

      expect(() => handleError(error)).toThrow('Something went wrong');
    });

    it('should handle boolean as message', () => {
      const error = {
        response: {
          data: {
            message: true,
          },
        },
      };

      // Boolean is not a valid string, should use default message
      expect(() => handleError(error)).toThrow('Something went wrong');
    });

    it('should handle object as message (not array)', () => {
      const error = {
        response: {
          data: {
            error: {
              details: {
                message: { key: 'value' },
              },
            },
          },
        },
      };

      expect(() => handleError(error)).toThrow('Something went wrong');
    });

    it('should handle deeply nested null values', () => {
      const error = {
        response: {
          data: {
            error: null,
            message: undefined,
          },
        },
      };

      expect(() => handleError(error)).toThrow('Something went wrong');
    });
  });

  // Equivalence Partitioning - Error Types
  describe('Equivalence Partitioning - HTTP Error Types', () => {
    describe('400 Bad Request Errors', () => {
      it('should handle validation errors', () => {
        const error = {
          response: {
            status: 400,
            data: {
              error: {
                details: {
                  message: ['Field is required', 'Invalid format'],
                },
              },
            },
          },
        };

        expect(() => handleError(error)).toThrow('Field is required, Invalid format');
      });
    });

    describe('401 Unauthorized Errors', () => {
      it('should handle authentication errors', () => {
        const error = {
          response: {
            status: 401,
            data: {
              message: 'Unauthorized access',
            },
          },
        };

        expect(() => handleError(error)).toThrow('Unauthorized access');
      });
    });

    describe('403 Forbidden Errors', () => {
      it('should handle permission errors', () => {
        const error = {
          response: {
            status: 403,
            data: {
              message: 'Insufficient permissions',
            },
          },
        };

        expect(() => handleError(error)).toThrow('Insufficient permissions');
      });
    });

    describe('404 Not Found Errors', () => {
      it('should handle resource not found', () => {
        const error = {
          response: {
            status: 404,
            data: {
              message: 'Resource not found',
            },
          },
        };

        expect(() => handleError(error)).toThrow('Resource not found');
      });
    });

    describe('500 Server Errors', () => {
      it('should handle internal server errors', () => {
        const error = {
          response: {
            status: 500,
            data: {
              message: 'Internal server error',
            },
          },
        };

        expect(() => handleError(error)).toThrow('Internal server error');
      });
    });

    describe('Network Errors', () => {
      it('should handle network timeout', () => {
        const error = {
          code: 'ECONNABORTED',
          message: 'timeout of 5000ms exceeded',
        };

        expect(() => handleError(error)).toThrow('Something went wrong');
      });

      it('should handle no internet connection', () => {
        const error = {
          code: 'ERR_NETWORK',
          message: 'Network Error',
        };

        expect(() => handleError(error)).toThrow('Something went wrong');
      });
    });
  });

  // Non-Functional - Logging Behavior
  describe('Non-Functional - Console Logging', () => {
    it('should log error.response.data to console.error', () => {
      const errorData = {
        message: 'Test error',
        code: 'TEST_ERROR',
      };

      const error = {
        response: {
          data: errorData,
        },
      };

      try {
        handleError(error);
      } catch {
        // Expected to throw
      }

      expect(console.error).toHaveBeenCalledWith('API Error:', errorData);
    });

    it('should log undefined when response.data is undefined', () => {
      const error = {
        response: {},
      };

      try {
        handleError(error);
      } catch {
        // Expected to throw
      }

      expect(console.error).toHaveBeenCalledWith('API Error:', undefined);
    });

    it('should always log before throwing', () => {
      // Create a fresh spy with implementation to avoid counting previous test calls
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const error = {
        response: {
          data: {
            message: 'Error message',
          },
        },
      };

      try {
        handleError(error);
      } catch {
        // Expected to throw
      }

      // Verify console.error was called with correct arguments
      expect(consoleErrorSpy).toHaveBeenCalledWith('API Error:', error.response.data);
      
      consoleErrorSpy.mockRestore();
    });
  });

  // Integration - Real-world Scenarios
  describe('Real-world Error Scenarios', () => {
    it('should handle Axios timeout error', () => {
      const error = {
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded',
        config: {},
      };

      expect(() => handleError(error)).toThrow('Something went wrong');
    });

    it('should handle CORS error', () => {
      const error = {
        message: 'Network Error',
        config: {},
      };

      expect(() => handleError(error)).toThrow('Something went wrong');
    });

    it('should handle backend validation error with multiple fields', () => {
      const error = {
        response: {
          status: 400,
          data: {
            error: {
              details: {
                message: [
                  'Name: Must not be empty',
                  'Email: Invalid email format',
                  'Age: Must be at least 18',
                ],
              },
            },
          },
        },
      };

      expect(() => handleError(error)).toThrow(
        'Name: Must not be empty, Email: Invalid email format, Age: Must be at least 18'
      );
    });

    it('should handle JWT expiration error', () => {
      const error = {
        response: {
          status: 401,
          data: {
            message: 'Token expired',
            code: 'TOKEN_EXPIRED',
          },
        },
      };

      expect(() => handleError(error)).toThrow('Token expired');
    });
  });
});
