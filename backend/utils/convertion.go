package utils

import "strconv"

func StrToInt(str string) (int, error) {
	value, err := strconv.Atoi(str)
	if err != nil {
		return 0, err
	}

	return value, nil
}
