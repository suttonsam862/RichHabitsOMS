import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { AuthForm } from "@/components/auth/AuthForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, UserPlus, CheckCircle } from "lucide-react";

interface InvitationData {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  expires: number;
  timestamp: number;
}

export default function Register() {
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [invitationError, setInvitationError] = useState<string | null>(null);

  // Process invitation token
  useEffect(() => {
    const inviteToken = searchParams.get('invite');
    if (inviteToken) {
      try {
        const decodedData = JSON.parse(Buffer.from(inviteToken, 'base64url').toString());
        
        // Check if invitation has expired
        if (decodedData.expires && Date.now() > decodedData.expires) {
          setInvitationError('This invitation has expired. Please contact your administrator for a new invitation.');
          return;
        }
        
        setInvitationData(decodedData);
      } catch (error) {
        setInvitationError('Invalid invitation link. Please check the URL or contact your administrator.');
      }
    }
  }, [searchParams]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !loading && user) {
      navigate(`/dashboard/${user.role}`);
    }
  }, [isAuthenticated, loading, navigate, user]);

  if (invitationError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-red-900">Invitation Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-gray-600">{invitationError}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">ThreadCraft</h1>
          {invitationData ? (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-green-600 mr-2" />
                <p className="text-lg font-medium text-gray-900">You're Invited!</p>
              </div>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-2">
                    <p className="text-sm text-gray-600">
                      <strong>{invitationData.firstName} {invitationData.lastName}</strong>
                    </p>
                    <p className="text-sm text-gray-600">{invitationData.email}</p>
                    <Badge variant="secondary" className="mt-2">
                      {invitationData.role}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
              <p className="text-sm text-gray-600">
                Complete your registration to join the team!
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-600">
              Create your account to get started
            </p>
          )}
        </div>
        <AuthForm type="register" invitationData={invitationData} />
      </div>
    </div>
  );
}
