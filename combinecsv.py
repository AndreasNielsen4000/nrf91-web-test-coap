import os
import csv

def combine_csv_files(input_folders, output_file):
    with open(output_file, 'w', newline='') as outfile:
        writer = csv.writer(outfile)
        for folder in input_folders:
            # print the folder available in os.
            print(f"Processing folder: {folder}")
            for filename in os.listdir(folder):
                # set filename into a csv file, since the filename is the needed info to be processed into the csv file. delimiter is set to ','
                with open(f"{folder}/{filename}", 'r') as infile:
                    reader = csv.reader(infile)
                    for row in reader:
                        writer.writerow(row)
            

if __name__ == "__main__":
    input_folders = ['nrf91-web-test-coap/238.csv', 'nrf91-web-test-coap/240.csv']
    output_file = 'combined.csv'
    combine_csv_files(input_folders, output_file)
    print(f"Combined CSV files into {output_file}")