from bottle import route, run, debug, template, request, static_file

import pandas as pd
import os
import joblib

import getngrams

app_path = os.path.dirname(__file__)

plot_titles = {
    "google": "Word Frequencies in Google Books, 1800-2000 (Case Sensitive)",
    "state_legislation": "Word Frequencies in State Legislation, 1700-2012",
    "court": "Word Frequencies in State Supreme Court Decisions, 1800-2012",
    "congressional_record": "Word Frequencies in U.S. Congressional Record, 1858-2015",
    "sec": "Word Frequencies in Annual 10-K Filings to SEC, 1996-2015",
    "legsouth": "Word Frequencies in State Legislation by Southern State Status, 1800-2012",
    "courtsouth": "Word Frequencies in State Supreme Court Decisions by Southern State Status, 1800-2012"
}

# Special "gram" that just gives a column of all-zeros
allzero_gram = "__allzero"
# load annual gram frequencies
os.chdir('/home/research/platform/textlab-apps/ngram-viewer/')
dfs = {}
dfs['court'] = pd.read_pickle('court-smoothed.pkl')
dfs['courtsouth'] = pd.read_pickle('courts-northsouth.pkl')
dfs['state_legislation'] = pd.read_pickle('legis-smoothed.pkl')
dfs['legsouth'] = pd.read_pickle('states-northsouth.pkl')
dfs['sec'] = pd.read_pickle('filings-smoothed.pkl')
dfs['congressional_record'] = pd.read_pickle('cong-smoothed.pkl')
# And add the allzero_gram as a special column in each
for key in dfs:
  dfs[key][allzero_gram] = 0

def generate_csv(data_df):
  data_df.loc[:,'id'] = range(1, len(data_df)+1)
  return data_df.fillna(0).to_csv(float_format='%.5f', index=False).replace("\n","\\n\\\n")

def make_figures(grams, err_list):
    """ 
    Take list of grams, make trend figures, save to eash public-html directory.
    """
    fname = ','.join(grams)
    
    csvs = {}
    no_data = []
    
    # Filter out grams not in the db
    valid_grams = {}
    for gnum, g in enumerate(grams):
      print(f"Gram #{gnum}: {g}")
      for df_name, cur_df in dfs.items():
        print(f"df_name = {df_name}")
        print(f"Example cols = {cur_df.columns[-115:-100]}")
        valid_grams[df_name] = []
        if g in cur_df.columns:
          valid_grams[df_name].append(g)
        else:
          # No ngram data
          err_list.append(f"No results for \"{g}\" in database {df_name}")
    # Special case: for google we just let getngrams.py handle it
    valid_grams['google'] = grams

    # Google NGrams
    query_str = ",".join(valid_grams['google']) + " -noprint"
    print(f"Running getngrams query {query_str}")
    saved_filename = getngrams.runQuery(query_str)
    google_data = pd.read_csv(saved_filename)
    # We don't need to plot the year column
    google_data = google_data.drop(columns=["year"])
    google_csv = generate_csv(google_data)
    csvs['google'] = google_csv
    
    # state supreme courts
    cur_key = 'court'
    cur_grams = valid_grams[cur_key]
    if len(cur_grams) == 0:
        no_data.append(cur_key)
    else:
      court_data = dfs[cur_key][cur_grams]
      court_csv = generate_csv(court_data)
      joblib.dump(court_csv, 'court_csv.pkl')
      csvs[cur_key] = court_csv
   
    # state legislatures
    cur_key = 'state_legislation'
    cur_grams = valid_grams[cur_key]
    if len(cur_grams) == 0:
        no_data.append(cur_key)
    else:
        legis_data = dfs[cur_key][cur_grams]
        csvs[cur_key] = generate_csv(legis_data)
    
    # sec filings
    cur_key = 'sec'
    cur_grams = valid_grams[cur_key]
    if len(cur_grams) == 0:
        no_data.append(cur_key)
    else:
        sec_data = dfs[cur_key][cur_grams]
        csvs[cur_key] = generate_csv(sec_data)
    
    # congressional record
    cur_key = 'congressional_record'
    cur_grams = valid_grams[cur_key]
    if len(cur_grams) == 0:
        no_data.append(cur_key)
    else:
        cong_data = dfs[cur_key][cur_grams]
        csvs[cur_key] = generate_csv(cong_data)
    
    cur_key = 'courtsouth'
    cur_grams = valid_grams[cur_key]
    if len(cur_grams) == 0:
        no_data.append(cur_key)
    else:
        # do courts and legislatures separately by south/non-south states
        nsgrams = []
        for g in cur_grams:
            if g != allzero_gram:
              nsgrams.append(g+'_south')
              nsgrams.append(g+'_nonsouth')
        courtsouth_data = dfs[cur_key][nsgrams]
        csvs[cur_key] = generate_csv(courtsouth_data)
    
    cur_key = 'legsouth'
    cur_grams = valid_grams[cur_key]
    if len(cur_grams) == 0:
        no_data.append(cur_key)
    else:
        legsouth_data = dfs[cur_key][cur_grams]
        csvs[cur_key] = generate_csv(legsouth_data)
    
    return csvs, no_data

# note the first argument here, sends gramstr to plot method
@route('/plot/<gramstr>', method='GET')
def plot(gramstr):
    """
    Convert URL to list of grams, send to make_figures, send to browser
    """
    if ',' in gramstr:
        grams = [g.strip() for g in gramstr.split(',')] # lists of grams
    else:
        grams = [gramstr.strip()] # single grams
    err_strings = [] # Holds error messages
    csvs, no_data = make_figures(grams, err_strings) # send to make figures
    # Create a list of error messages
    err_output = ""
    for e in err_strings:
      err_output = err_output + "<li>" + str(e) + "</li>"
    if err_output != "":
      err_output = "<ul>" + err_output + "</ul>"
    figname = ','.join(grams) # base filename for figs
    return template('plot.htm', figname=figname, csv_data=csvs, err=err_output, titles=plot_titles) # send figname to plot.htm

from bottle import static_file    

@route('/js/<filename>')
@route('/app/js/<filename>')
def send_js(filename):
    print(f"js request! filename = {filename}, wd = {os.getcwd()}")
    js_path = os.path.join("static","js")
    print(f"Looking in {js_path}")
    return static_file(filename, root=js_path)
    
@route('/', method='GET')
@route('/app', method='GET')
@route('/plot', method='GET')
def app():
  # "Homepage" for the app, allowing submission to the plot() function
  submitted_str = request.GET.get('query','')
  corpora = request.GET.get('corpora','')
  print(corpora)
  if submitted_str == '':
    # Homepage
    return template('submit.htm')
  else:
    # Text was submitted, forward to plot() function
    return plot(submitted_str)

debug(True)
run(host='0.0.0.0',port=8081,reloader=True)