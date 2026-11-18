import React from 'react';
import { formatReadableFirestoreError } from '../firebase/errors';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: formatReadableFirestoreError(
        error,
        'An unexpected error occurred while loading the portal.'
      ),
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-xl px-4 py-16">
          <div
            role="alert"
            className="rounded-xl border border-[#fecaca] bg-white p-6 text-[#17221c]"
          >
            <h1 className="font-heading text-xl font-semibold text-[#b91c1c]">
              Unable to complete request
            </h1>
            <p className="mt-2 text-sm text-[#5a6a61]">{this.state.message}</p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.assign('/');
              }}
              className="mt-5 rounded-lg bg-[#185a39] px-4 py-2 text-sm font-medium text-white hover:bg-[#0e3623]"
            >
              Return to home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
