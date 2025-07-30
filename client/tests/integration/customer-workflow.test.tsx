import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import '@testing-library/jest-dom';

// Mock components for testing
import CustomerListPage from '../../src/pages/admin/CustomerListPage';
import { AuthProvider } from '../../src/context/AuthContext';

// Mock data
const mockCustomers = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '555-0123',
    company: 'Acme Corp',
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2', 
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '555-0456',
    company: 'Tech Inc',
    created_at: '2024-01-02T00:00:00Z'
  }
];

// Mock server
const server = setupServer(
  rest.get('/api/customers', (req, res, ctx) => {
    return res(ctx.json(mockCustomers));
  }),
  
  rest.post('/api/customers', (req, res, ctx) => {
    const newCustomer = req.body;
    return res(
      ctx.status(201),
      ctx.json({
        id: '3',
        ...newCustomer,
        created_at: new Date().toISOString()
      })
    );
  }),
  
  rest.put('/api/customers/:id', (req, res, ctx) => {
    const { id } = req.params;
    const updatedCustomer = req.body;
    return res(
      ctx.json({
        id,
        ...updatedCustomer,
        updated_at: new Date().toISOString()
      })
    );
  }),
  
  rest.delete('/api/customers/:id', (req, res, ctx) => {
    return res(ctx.status(204));
  })
);

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('Customer Workflow Integration Tests', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  describe('Customer List Display', () => {
    test('should load and display customers list', async () => {
      render(
        <TestWrapper>
          <CustomerListPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });

      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    });

    test('should handle empty customer list', async () => {
      server.use(
        rest.get('/api/customers', (req, res, ctx) => {
          return res(ctx.json([]));
        })
      );

      render(
        <TestWrapper>
          <CustomerListPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/no customers/i)).toBeInTheDocument();
      });
    });

    test('should handle API errors gracefully', async () => {
      server.use(
        rest.get('/api/customers', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Internal server error' }));
        })
      );

      render(
        <TestWrapper>
          <CustomerListPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/error loading customers/i)).toBeInTheDocument();
      });
    });
  });

  describe('Customer Creation', () => {
    test('should create new customer with valid data', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CustomerListPage />
        </TestWrapper>
      );

      // Open add customer form
      const addButton = await screen.findByText(/add customer/i);
      await user.click(addButton);

      // Fill form fields
      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const phoneInput = screen.getByLabelText(/phone/i);
      const companyInput = screen.getByLabelText(/company/i);

      await user.type(nameInput, 'Alice Johnson');
      await user.type(emailInput, 'alice@example.com');
      await user.type(phoneInput, '555-0789');
      await user.type(companyInput, 'Design Studio');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      // Verify success
      await waitFor(() => {
        expect(screen.getByText('Customer created successfully')).toBeInTheDocument();
      });
    });

    test('should validate required fields', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CustomerListPage />
        </TestWrapper>
      );

      // Open add customer form
      const addButton = await screen.findByText(/add customer/i);
      await user.click(addButton);

      // Try to submit without filling required fields
      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      // Verify validation errors
      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });

    test('should validate email format', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CustomerListPage />
        </TestWrapper>
      );

      // Open add customer form
      const addButton = await screen.findByText(/add customer/i);
      await user.click(addButton);

      // Fill with invalid email
      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);

      await user.type(nameInput, 'Test User');
      await user.type(emailInput, 'invalid-email');

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      // Verify email validation error
      await waitFor(() => {
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
      });
    });

    test('should handle duplicate customer creation', async () => {
      const user = userEvent.setup();
      
      server.use(
        rest.post('/api/customers', (req, res, ctx) => {
          return res(
            ctx.status(409),
            ctx.json({ error: 'Customer with this email already exists' })
          );
        })
      );

      render(
        <TestWrapper>
          <CustomerListPage />
        </TestWrapper>
      );

      // Open add customer form and fill with duplicate data
      const addButton = await screen.findByText(/add customer/i);
      await user.click(addButton);

      await user.type(screen.getByLabelText(/name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@example.com');

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      // Verify duplicate error handling
      await waitFor(() => {
        expect(screen.getByText(/customer with this email already exists/i)).toBeInTheDocument();
      });
    });
  });

  describe('Customer Management', () => {
    test('should edit existing customer', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CustomerListPage />
        </TestWrapper>
      );

      // Wait for customers to load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Click edit button for first customer
      const editButton = screen.getAllByText(/edit/i)[0];
      await user.click(editButton);

      // Update customer name
      const nameInput = screen.getByDisplayValue('John Doe');
      await user.clear(nameInput);
      await user.type(nameInput, 'John Updated');

      // Save changes
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Verify update success
      await waitFor(() => {
        expect(screen.getByText('Customer updated successfully')).toBeInTheDocument();
      });
    });

    test('should delete customer with confirmation', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CustomerListPage />
        </TestWrapper>
      );

      // Wait for customers to load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButton = screen.getAllByText(/delete/i)[0];
      await user.click(deleteButton);

      // Confirm deletion
      const confirmButton = await screen.findByText(/confirm/i);
      await user.click(confirmButton);

      // Verify deletion success
      await waitFor(() => {
        expect(screen.getByText('Customer deleted successfully')).toBeInTheDocument();
      });
    });

    test('should search and filter customers', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CustomerListPage />
        </TestWrapper>
      );

      // Wait for customers to load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });

      // Search for specific customer
      const searchInput = screen.getByPlaceholderText(/search customers/i);
      await user.type(searchInput, 'Jane');

      // Verify filtered results
      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle network timeouts', async () => {
      server.use(
        rest.get('/api/customers', (req, res, ctx) => {
          return res(ctx.delay('infinite'));
        })
      );

      render(
        <TestWrapper>
          <CustomerListPage />
        </TestWrapper>
      );

      // Should show loading state
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    test('should handle malformed API responses', async () => {
      server.use(
        rest.get('/api/customers', (req, res, ctx) => {
          return res(ctx.text('Invalid JSON'));
        })
      );

      render(
        <TestWrapper>
          <CustomerListPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/error loading customers/i)).toBeInTheDocument();
      });
    });

    test('should handle extremely long customer names', async () => {
      const user = userEvent.setup();
      const longName = 'A'.repeat(300);
      
      render(
        <TestWrapper>
          <CustomerListPage />
        </TestWrapper>
      );

      const addButton = await screen.findByText(/add customer/i);
      await user.click(addButton);

      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, longName);

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      // Should handle validation for max length
      await waitFor(() => {
        expect(screen.getByText(/name too long/i)).toBeInTheDocument();
      });
    });

    test('should handle special characters in input fields', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CustomerListPage />
        </TestWrapper>
      );

      const addButton = await screen.findByText(/add customer/i);
      await user.click(addButton);

      await user.type(screen.getByLabelText(/name/i), 'José María Öz');
      await user.type(screen.getByLabelText(/email/i), 'josé@müller.com');
      await user.type(screen.getByLabelText(/company/i), 'Müller & Søn');

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      // Should handle international characters properly
      await waitFor(() => {
        expect(screen.getByText('Customer created successfully')).toBeInTheDocument();
      });
    });
  });
});