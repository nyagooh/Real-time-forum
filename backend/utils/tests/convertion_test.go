package utils

import (
	"testing"

	"forum/backend/utils"
)

func TestStrToInt(t *testing.T) {
	type args struct {
		str string
	}
	tests := []struct {
		name    string
		args    args
		want    int
		wantErr bool
	}{
		{
			name:    "Valid integer string",
			args:    args{str: "123"},
			want:    123,
			wantErr: false,
		},
		{
			name:    "Negative integer string",
			args:    args{str: "-456"},
			want:    -456,
			wantErr: false,
		},
		{
			name:    "Zero string",
			args:    args{str: "0"},
			want:    0,
			wantErr: false,
		},
		{
			name:    "Non-numeric string",
			args:    args{str: "abc"},
			want:    0,
			wantErr: true,
		},
		{
			name:    "Empty string",
			args:    args{str: ""},
			want:    0,
			wantErr: true,
		},
		{
			name:    "String with spaces",
			args:    args{str: " 123 "},
			want:    0,
			wantErr: true,
		},
		{
			name:    "String with special characters",
			args:    args{str: "12@3"},
			want:    0,
			wantErr: true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := utils.StrToInt(tt.args.str)
			if (err != nil) != tt.wantErr {
				t.Errorf("StrToInt() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if got != tt.want {
				t.Errorf("StrToInt() = %v, want %v", got, tt.want)
			}
		})
	}
}
