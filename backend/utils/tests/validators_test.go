package utils

import (
	"testing"

	"forum/backend/utils"
)

func TestValidateEmail(t *testing.T) {
	type args struct {
		email string
	}
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			name:    "Valid email",
			args:    args{email: "test@example.com"},
			wantErr: false,
		},
		{
			name:    "Invalid email - missing @",
			args:    args{email: "testexample.com"},
			wantErr: true,
		},
		{
			name:    "Invalid email - missing domain",
			args:    args{email: "test@"},
			wantErr: true,
		},
		{
			name:    "Invalid email - too long",
			args:    args{email: "a" + string(make([]byte, 254)) + "@example.com"},
			wantErr: true,
		},
		{
			name:    "Invalid email - special characters",
			args:    args{email: "test@exa!mple.com"},
			wantErr: true,
		},
		{
			name:    "Valid email with subdomain",
			args:    args{email: "test@mail.example.com"},
			wantErr: false,
		},
		{
			name:    "Invalid email - double dots",
			args:    args{email: "test..email@example.com"},
			wantErr: false,
		},
		{
			name:    "Valid email with numbers",
			args:    args{email: "user123@example.com"},
			wantErr: false,
		},
		{
			name:    "Invalid email - trailing dot in domain",
			args:    args{email: "test@example.com."},
			wantErr: true,
		},
		{
			name:    "Invalid email - empty string",
			args:    args{email: ""},
			wantErr: true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := utils.ValidateEmail(tt.args.email); (err != nil) != tt.wantErr {
				t.Errorf("ValidateEmail() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
