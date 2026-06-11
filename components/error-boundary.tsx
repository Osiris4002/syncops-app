import React, { type ReactNode } from "react";
import { View, Text, TouchableOpacity } from "react-native";

import { ScreenContainer } from "@/components/screen-container";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ScreenContainer className="items-center justify-center gap-4">
          <View className="gap-4 items-center">
            <Text className="text-2xl font-bold text-error">Something went wrong</Text>
            <Text className="text-muted text-center max-w-xs">
              {this.state.error?.message || "An unexpected error occurred"}
            </Text>
            <TouchableOpacity onPress={this.handleReset} className="bg-primary rounded-lg px-6 py-3">
              <Text className="text-white font-semibold">Try again</Text>
            </TouchableOpacity>
          </View>
        </ScreenContainer>
      );
    }

    return this.props.children;
  }
}
