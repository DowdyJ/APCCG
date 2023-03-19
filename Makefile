all:
	@npx tsc

clean:
	-rm *.js &>/dev/null
	-find ./source/ -name "*.js" -type f -delete &>/dev/null